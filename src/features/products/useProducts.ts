import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '../../services/apiClient'
import { buildApiUrl } from '../../services/apiUrl'
import { buildProductsEndpoint } from '../../services/productPaths'

export type ProductStatus = 'activo' | 'inactivo'

export type ProductItem = {
  id: string
  backend_id?: number
  codigo_producto?: string
  image_s3_key?: string
  image_url: string
  nombre: string
  precio: number
  estado: ProductStatus
  categoria?: string
  categoriaID?: number
  descripcion?: string
}

type UseProductsReturn = {
  products: ProductItem[]
  isLoading: boolean
  createProduct: (input: Omit<ProductItem, 'id'>) => ProductItem
  reloadProducts: () => Promise<ProductItem[]>
  updateProduct: (id: string, patch: Partial<Omit<ProductItem, 'id'>>) => Promise<boolean>
  toggleProductStatus: (id: string) => Promise<boolean>
  removeProduct: (id: string) => Promise<'deleted' | 'backend_locked' | 'not_found' | 'error'>
  replaceProductImage: (
    id: string,
    input: { file?: File; s3Key?: string },
  ) => Promise<{ image_url: string; image_s3_key?: string }>
}

type AnyRecord = Record<string, unknown>
type ProductCacheEntry = {
  items: ProductItem[]
  loadedAt: number
}

const productsCache = new Map<string, ProductCacheEntry>()

function navigateTo(path: string): void {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:')
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAbsoluteUrl(rawUrl: string): string {
  const url = rawUrl.trim()
  if (!url) return ''
  if (/^(https?:|blob:|data:)/i.test(url)) return url
  try {
    return buildApiUrl(url)
  } catch {
    return url
  }
}

function getImageFromNested(item: AnyRecord): string {
  const directNested =
    (item.imagen as AnyRecord | undefined) ??
    (item.image as AnyRecord | undefined) ??
    (item.thumbnail as AnyRecord | undefined)

  if (directNested && typeof directNested === 'object') {
    const nestedUrl =
      toStringOrEmpty(directNested.url) ||
      toStringOrEmpty(directNested.image_url) ||
      toStringOrEmpty(directNested.imagen_url) ||
      toStringOrEmpty(directNested.imagenUrl)
    if (nestedUrl) return normalizeAbsoluteUrl(nestedUrl)
  }

  const imagesArray =
    (Array.isArray(item.imagenes) ? item.imagenes : null) ??
    (Array.isArray(item.images) ? item.images : null) ??
    (Array.isArray(item.fotos) ? item.fotos : null)

  if (imagesArray && imagesArray.length > 0) {
    const first = imagesArray[0]
    if (first && typeof first === 'object') {
      const firstRecord = first as AnyRecord
      const arrayUrl =
        toStringOrEmpty(firstRecord.url) ||
        toStringOrEmpty(firstRecord.image_url) ||
        toStringOrEmpty(firstRecord.imagen_url) ||
        toStringOrEmpty(firstRecord.imagenUrl)
      if (arrayUrl) return normalizeAbsoluteUrl(arrayUrl)
    }
  }

  return ''
}

function looksLikeImagePath(value: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(value)
}

function getImageByHeuristic(source: unknown, depth = 0): string {
  if (!source || depth > 3) return ''

  if (typeof source === 'string') {
    const candidate = source.trim()
    if (!candidate) return ''
    if (/^(https?:|blob:|data:|\/)/i.test(candidate) && looksLikeImagePath(candidate)) {
      return normalizeAbsoluteUrl(candidate)
    }
    return ''
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const nested = getImageByHeuristic(item, depth + 1)
      if (nested) return nested
    }
    return ''
  }

  if (typeof source === 'object') {
    const record = source as AnyRecord
    for (const [key, value] of Object.entries(record)) {
      const lower = key.toLowerCase()
      if (lower.includes('logo')) {
        continue
      }
      if (
        lower.includes('image') ||
        lower.includes('imagen') ||
        lower.includes('foto') ||
        lower.includes('thumb') ||
        lower.includes('url')
      ) {
        const nested = getImageByHeuristic(value, depth + 1)
        if (nested) return nested
      }
    }
  }

  return ''
}

function normalizeEstado(value: unknown): ProductStatus {
  if (typeof value === 'boolean') {
    return value ? 'activo' : 'inactivo'
  }

  const str = toStringOrEmpty(value).toLowerCase()
  if (str === 'activo' || str === 'active' || str === '1' || str === 'true') {
    return 'activo'
  }

  return 'inactivo'
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data
  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData.trim()
  }

  if (responseData && typeof responseData === 'object') {
    const record = responseData as AnyRecord
    const candidate =
      toStringOrEmpty(record.detail) ||
      toStringOrEmpty(record.message) ||
      toStringOrEmpty(record.error) ||
      toStringOrEmpty(record.mensaje)
    if (candidate) return candidate
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function normalizeProductImageResponse(payload: unknown): {
  image_url: string
  image_s3_key?: string
} | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as AnyRecord
  const nested =
    record.data && typeof record.data === 'object' ? (record.data as AnyRecord) : null
  const merged = nested ? { ...record, ...nested } : record

  const imageUrl =
    toStringOrEmpty(merged.imagenUrl) ||
    toStringOrEmpty(merged.imageUrl) ||
    toStringOrEmpty(merged.imagen_url) ||
    toStringOrEmpty(merged.image_url)

  const imageS3Key =
    toStringOrEmpty(merged.imagenS3Key) ||
    toStringOrEmpty(merged.imageS3Key) ||
    toStringOrEmpty(merged.imagen_s3_key) ||
    toStringOrEmpty(merged.image_s3_key) ||
    toStringOrEmpty(merged.s3Key)

  if (!imageUrl && !imageS3Key) return null

  return {
    image_url: normalizeAbsoluteUrl(imageUrl),
    image_s3_key: imageS3Key || undefined,
  }
}

function normalizeProduct(raw: unknown): ProductItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as AnyRecord

  const idRaw = item.id ?? item.productoID ?? item.productId ?? item.productID
  const id = toStringOrEmpty(idRaw) || String(toNumber(idRaw))
  if (!id || id === '0') return null
  const backendID = toNumber(item.id ?? item.productoID ?? item.productId ?? item.productID)

  const nombre =
    toStringOrEmpty(item.nombre) ||
    toStringOrEmpty(item.name) ||
    toStringOrEmpty(item.titulo) ||
    'Sin nombre'

  const precio =
    toNumber(item.precio) ||
    toNumber(item.price) ||
    toNumber(item.valor)

  const imageUrlRaw =
    toStringOrEmpty(item.image_url) ||
    toStringOrEmpty(item.imagen_url) ||
    toStringOrEmpty(item.imagenUrl) ||
    toStringOrEmpty(item.imageUrl) ||
    toStringOrEmpty(item.imagenURL) ||
    toStringOrEmpty(item.foto) ||
    toStringOrEmpty(item.foto_url) ||
    toStringOrEmpty(item.thumbnail) ||
    toStringOrEmpty(item.thumb) ||
    toStringOrEmpty(item.imagen) ||
    toStringOrEmpty(item.url) ||
    getImageFromNested(item) ||
    getImageByHeuristic(item)

  const imageUrl = normalizeAbsoluteUrl(imageUrlRaw)

  return {
    id,
    backend_id: Number.isFinite(backendID) && backendID > 0 ? backendID : undefined,
    codigo_producto: toStringOrEmpty(item.codigo_producto ?? item.codigoProducto ?? item.codigo),
    image_s3_key: toStringOrEmpty(item.imagen_s3_key ?? item.imagenS3Key ?? item.image_s3_key ?? item.imageS3Key),
    image_url: imageUrl,
    nombre,
    precio,
    estado: normalizeEstado(item.estado ?? item.status ?? item.active),
    categoria: toStringOrEmpty(item.categoria ?? item.category),
    categoriaID:
      toNumber(item.categoria_id) ||
      toNumber(item.categoriaId) ||
      toNumber(item.category_id) ||
      toNumber(item.categoryId) ||
      undefined,
    descripcion: toStringOrEmpty(item.descripcion ?? item.description),
  }
}

function extractArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload

  if (payload && typeof payload === 'object') {
    const root = payload as AnyRecord

    if (Array.isArray(root.data)) return root.data
    if (Array.isArray(root.items)) return root.items
    if (Array.isArray(root.productos)) return root.productos
    if (Array.isArray(root.products)) return root.products

    if (root.data && typeof root.data === 'object') {
      const nested = root.data as AnyRecord
      if (Array.isArray(nested.data)) return nested.data
      if (Array.isArray(nested.items)) return nested.items
      if (Array.isArray(nested.productos)) return nested.productos
      if (Array.isArray(nested.products)) return nested.products
    }
  }

  return []
}

function buildStatusEndpoints(productId: string, empresaID: string): string[] {
  const query = `empresa_id=${encodeURIComponent(empresaID)}`
  const endpoint = `${buildProductsEndpoint(productId, 'estado')}?${query}`
  return [endpoint]
}

function buildUpdateEndpoints(productId: string, empresaID: string): string[] {
  const query = `empresa_id=${encodeURIComponent(empresaID)}`
  return [`${buildProductsEndpoint(productId)}?${query}`, buildProductsEndpoint(productId)]
}

export function useProducts(empresaID: string): UseProductsReturn {
  const revokedRef = useRef<Set<string>>(new Set())

  const [productosBackend, setProductosBackend] = useState<ProductItem[]>([])
  const [productosLocal, setProductosLocal] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const productos = useMemo(
    () => [...productosBackend, ...productosLocal],
    [productosBackend, productosLocal],
  )

  const revokeBlobUrls = useCallback((items: ProductItem[]) => {
    items.forEach((product) => {
      if (isBlobUrl(product.image_url) && !revokedRef.current.has(product.image_url)) {
        URL.revokeObjectURL(product.image_url)
        revokedRef.current.add(product.image_url)
      }
    })
  }, [])

  const clearLocalProducts = useCallback(() => {
    setProductosLocal((current) => {
      revokeBlobUrls(current)
      return []
    })
  }, [revokeBlobUrls])

  const loadProducts = useCallback(
    async (force = false): Promise<ProductItem[]> => {
      const normalizedEmpresaID = empresaID.trim()

      if (!normalizedEmpresaID) {
        setIsLoading(false)
        setProductosBackend([])
        clearLocalProducts()
        return []
      }

      const cacheKey = normalizedEmpresaID
      if (!force) {
        const cached = productsCache.get(cacheKey)
        if (cached) {
          setProductosBackend(cached.items)
          clearLocalProducts()
          setIsLoading(false)
          return cached.items
        }
      }

      try {
        setIsLoading(true)
        const endpoint = `${buildProductsEndpoint()}?empresa_id=${encodeURIComponent(normalizedEmpresaID)}`
        const res = await apiClient.get(endpoint)

        const payloadArray = extractArrayPayload(res.data)
        const normalized = payloadArray
          .map((item) => normalizeProduct(item))
          .filter((item): item is ProductItem => item !== null)

        productsCache.set(cacheKey, {
          items: normalized,
          loadedAt: Date.now(),
        })

        setProductosBackend(normalized)
        clearLocalProducts()
        return normalized
      } catch (error) {
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [empresaID, clearLocalProducts],
  )

  const reloadProducts = useCallback(async (): Promise<ProductItem[]> => loadProducts(true), [loadProducts])

  useEffect(() => {
    void loadProducts(false)
  }, [loadProducts])

  useEffect(() => {
    return () => revokeBlobUrls(productos)
  }, [productos, revokeBlobUrls])

  const createProduct = useCallback((input: Omit<ProductItem, 'id'>) => {
    const created: ProductItem = {
      ...input,
      id: crypto.randomUUID(),
    }

    setProductosLocal((prev) => [created, ...prev])
    navigateTo('/products')
    return created
  }, [])

  const updateProduct = useCallback(
    async (id: string, patch: Partial<Omit<ProductItem, 'id'>>): Promise<boolean> => {
      const localIndex = productosLocal.findIndex((product) => product.id === id)
      if (localIndex >= 0) {
        setProductosLocal((prev) =>
          prev.map((product) => (product.id === id ? { ...product, ...patch } : product)),
        )
        return true
      }

      const backendProduct = productosBackend.find((product) => product.id === id)
      if (!backendProduct) return false

      const payload: Record<string, unknown> = {}
      if (typeof patch.nombre === 'string') payload.nombre = patch.nombre
      if (typeof patch.codigo_producto === 'string') {
        payload.codigo_producto = patch.codigo_producto
        payload.codigoProducto = patch.codigo_producto
        payload.codigo = patch.codigo_producto
      }
      if (typeof patch.precio === 'number') payload.precio = patch.precio
      if (typeof patch.categoria === 'string') payload.categoria = patch.categoria
      if (typeof patch.categoriaID === 'number') {
        payload.categoriaID = patch.categoriaID
        payload.categoria_id = patch.categoriaID
      }
      if (typeof patch.descripcion === 'string') payload.descripcion = patch.descripcion

      if (Object.keys(payload).length === 0) {
        return true
      }

      const endpoints = buildUpdateEndpoints(id, empresaID)
      const methods: Array<'patch' | 'put'> = ['patch', 'put']

      try {
        for (const endpoint of endpoints) {
          for (const method of methods) {
            try {
              await apiClient.request({
                url: endpoint,
                method,
                data: payload,
              })
              await loadProducts(true)
              return true
            } catch (error: unknown) {
              const status = (error as { response?: { status?: number } })?.response?.status
              if (status === 404 || status === 405 || status === 422 || status === 400) {
                continue
              }
              throw error
            }
          }
        }

        throw new Error('No se pudo persistir la edicion del producto en backend.')
      } catch (error) {
        return false
      }
    },
    [empresaID, loadProducts, productosBackend, productosLocal],
  )

  const toggleProductStatus = useCallback(
    async (id: string): Promise<boolean> => {
      const localProduct = productosLocal.find((product) => product.id === id)
      if (localProduct) {
        const nextEstado: ProductStatus = localProduct.estado === 'activo' ? 'inactivo' : 'activo'
        setProductosLocal((prev) =>
          prev.map((product) => (product.id === id ? { ...product, estado: nextEstado } : product)),
        )
        return true
      }

      const current = productosBackend.find((product) => product.id === id)
      if (!current) return false

      const nextEstado: ProductStatus = current.estado === 'activo' ? 'inactivo' : 'activo'
      const endpoints = buildStatusEndpoints(id, empresaID)
      const payloads = [{ estado: nextEstado }]
      const methods: Array<'patch'> = ['patch']

      try {
        for (const endpoint of endpoints) {
          for (const method of methods) {
            for (const payload of payloads) {
              try {
                await apiClient.request({
                  url: endpoint,
                  method,
                  data: payload,
                })
                await loadProducts(true)
                return true
              } catch (error: unknown) {
                const status = (error as { response?: { status?: number } })?.response?.status
                if (status === 404 || status === 405 || status === 422 || status === 400) {
                  continue
                }
                throw error
              }
            }
          }
        }
        throw new Error('No se pudo actualizar estado con PATCH /admin/productos/:id/estado.')
      } catch (error) {
        return false
      }
    },
    [empresaID, loadProducts, productosBackend, productosLocal],
  )

  const removeProduct = useCallback(
    async (id: string): Promise<'deleted' | 'backend_locked' | 'not_found' | 'error'> => {
      const localProduct = productosLocal.find((product) => product.id === id)
      if (localProduct) {
        setProductosLocal((prev) => {
          const target = prev.find((product) => product.id === id)
          if (target && isBlobUrl(target.image_url) && !revokedRef.current.has(target.image_url)) {
            URL.revokeObjectURL(target.image_url)
            revokedRef.current.add(target.image_url)
          }
          return prev.filter((product) => product.id !== id)
        })
        return 'deleted'
      }

      const backendProduct = productosBackend.find((product) => product.id === id)
      if (backendProduct) return 'backend_locked'

      return 'not_found'
    },
    [productosBackend, productosLocal],
  )

  const replaceProductImage = useCallback(
    async (
      id: string,
      input: { file?: File; s3Key?: string },
    ): Promise<{ image_url: string; image_s3_key?: string }> => {
      const localIndex = productosLocal.findIndex((product) => product.id === id)
      const localProduct = localIndex >= 0 ? productosLocal[localIndex] : null
      const backendProduct = productosBackend.find((product) => product.id === id)

      if (!input.file && !input.s3Key?.trim()) {
        throw new Error('Debes enviar un archivo o un s3Key para reemplazar la imagen.')
      }

      if (localProduct && !backendProduct?.backend_id) {
        if (!input.file) {
          throw new Error('Para productos locales, el reemplazo de imagen requiere un archivo.')
        }

        const nextImageUrl = URL.createObjectURL(input.file)
        setProductosLocal((prev) =>
          prev.map((product) => {
            if (product.id !== id) return product

            if (isBlobUrl(product.image_url) && !revokedRef.current.has(product.image_url)) {
              URL.revokeObjectURL(product.image_url)
              revokedRef.current.add(product.image_url)
            }

            return {
              ...product,
              image_url: nextImageUrl,
            }
          }),
        )

        return {
          image_url: nextImageUrl,
          image_s3_key: localProduct.image_s3_key,
        }
      }

      const productoID = backendProduct?.backend_id
      if (!productoID) {
        throw new Error('No se encontró un producto backend válido para reemplazar la imagen.')
      }

      const endpoint = buildProductsEndpoint(String(productoID), 'imagen')

      try {
        const response = input.file
          ? await apiClient.patch(
              endpoint,
              (() => {
                const formData = new FormData()
                formData.append('file', input.file as Blob)
                formData.append('empresa_id', String(empresaID))
                return formData
              })(),
            )
          : await apiClient.patch(endpoint, {
              empresa_id: empresaID,
              s3Key: input.s3Key?.trim(),
            })

        const normalized = normalizeProductImageResponse(response.data)
        if (!normalized) {
          throw new Error('El backend no devolvió una respuesta válida para la imagen.')
        }

        setProductosBackend((prev) =>
          prev.map((product) =>
            product.id === id
              ? {
                  ...product,
                  image_url: normalized.image_url,
                  image_s3_key: normalized.image_s3_key,
                }
              : product,
          ),
        )

        return normalized
      } catch (error) {
        throw new Error(extractErrorMessage(error, 'No se pudo reemplazar la imagen del producto.'))
      }
    },
    [empresaID, productosBackend, productosLocal],
  )

  return {
    products: productos,
    isLoading,
    createProduct,
    reloadProducts,
    updateProduct,
    toggleProductStatus,
    removeProduct,
    replaceProductImage,
  }
}
