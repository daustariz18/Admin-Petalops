import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '../../services/apiClient'

export type ProductStatus = 'activo' | 'inactivo'

export type ProductItem = {
  id: string
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
  updateProduct: (id: string, patch: Partial<Omit<ProductItem, 'id'>>) => Promise<boolean>
  toggleProductStatus: (id: string) => Promise<boolean>
  removeProduct: (id: string) => void
  replaceProductImage: (id: string, file: File) => void
}

type AnyRecord = Record<string, unknown>
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
const PRODUCTS_BASE_PATH =
  (import.meta.env.VITE_PRODUCTS_BASE_PATH as string | undefined)?.trim() || '/admin/productos'

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
  const base = API_BASE.replace(/\/$/, '')
  if (!base) return url
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
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

function normalizeProduct(raw: unknown): ProductItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as AnyRecord

  const idRaw = item.id ?? item.productoID ?? item.productId ?? item.productID
  const id = toStringOrEmpty(idRaw) || String(toNumber(idRaw))
  if (!id || id === '0') return null

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
  const pid = encodeURIComponent(productId)
  const base = PRODUCTS_BASE_PATH.replace(/\/$/, '')
  const endpoint = `${base}/${pid}/estado?${query}`
  return [endpoint]
}

function buildUpdateEndpoints(productId: string, empresaID: string): string[] {
  const query = `empresa_id=${encodeURIComponent(empresaID)}`
  const pid = encodeURIComponent(productId)
  const base = PRODUCTS_BASE_PATH.replace(/\/$/, '')
  return [`${base}/${pid}?${query}`, `${base}/${pid}`]
}

export function useProducts(empresaID: string): UseProductsReturn {
  const storageKey = useMemo(() => `petalops.products.${empresaID || 'default'}`, [empresaID])
  const revokedRef = useRef<Set<string>>(new Set())

  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        setProducts(parsed as ProductItem[])
      }
    } catch {
      setProducts([])
    }
  }, [storageKey])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(products))
  }, [products, storageKey])

  useEffect(() => {
    console.log('Productos cargados:', products)
  }, [products])

  useEffect(() => {
    let active = true

    const loadProducts = async () => {
      if (!empresaID?.trim()) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const endpoint = `${PRODUCTS_BASE_PATH.replace(/\/$/, '')}?empresa_id=${encodeURIComponent(empresaID)}`
        const res = await apiClient.get(endpoint)

        console.log('Respuesta backend productos:', res.data)

        const payloadArray = extractArrayPayload(res.data)
        const normalized = payloadArray
          .map((item) => normalizeProduct(item))
          .filter((item): item is ProductItem => item !== null)

        console.log('Productos normalizados:', normalized)
        console.log(
          'Debug imagenes productos:',
          payloadArray.map((item) => ({
            raw: item,
            parsedImage: normalizeProduct(item)?.image_url ?? '',
          })),
        )

        if (active) {
          setProducts(normalized)
        }
      } catch (error) {
        console.log('Error al cargar productos:', error)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadProducts()

    return () => {
      active = false
    }
  }, [empresaID])

  useEffect(() => {
    return () => {
      products.forEach((product) => {
        if (isBlobUrl(product.image_url) && !revokedRef.current.has(product.image_url)) {
          URL.revokeObjectURL(product.image_url)
          revokedRef.current.add(product.image_url)
        }
      })
    }
  }, [products])

  const createProduct = useCallback((input: Omit<ProductItem, 'id'>) => {
    const created: ProductItem = {
      ...input,
      id: crypto.randomUUID(),
    }

    setProducts((prev) => [created, ...prev])
    navigateTo('/products')
    return created
  }, [])

  const updateProduct = useCallback(
    async (id: string, patch: Partial<Omit<ProductItem, 'id'>>): Promise<boolean> => {
      const current = products.find((product) => product.id === id)
      if (!current) return false

      setProducts((prev) => prev.map((product) => (product.id === id ? { ...product, ...patch } : product)))

      const payload: Record<string, unknown> = {}
      if (typeof patch.nombre === 'string') payload.nombre = patch.nombre
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
              if (import.meta.env.DEV) {
                console.log('[update-product] intentando', { method, endpoint, payload })
              }
              await apiClient.request({
                url: endpoint,
                method,
                data: payload,
              })
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
        setProducts((prev) =>
          prev.map((product) => (product.id === id ? { ...product, ...current } : product)),
        )
        console.log('Error al actualizar producto:', error)
        return false
      }
    },
    [empresaID, products],
  )

  const toggleProductStatus = useCallback(
    async (id: string): Promise<boolean> => {
      const current = products.find((product) => product.id === id)
      if (!current) return false

      const nextEstado: ProductStatus = current.estado === 'activo' ? 'inactivo' : 'activo'
      const endpoints = buildStatusEndpoints(id, empresaID)
      const payloads = [{ estado: nextEstado }]
      const methods: Array<'patch'> = ['patch']

      // Optimistic update: rollback if backend rejects.
      setProducts((prev) =>
        prev.map((product) => (product.id === id ? { ...product, estado: nextEstado } : product)),
      )

      try {
        for (const endpoint of endpoints) {
          for (const method of methods) {
            for (const payload of payloads) {
              try {
                if (import.meta.env.DEV) {
                  console.log('[toggle-status] intentando', { method, endpoint, payload })
                }
                await apiClient.request({
                  url: endpoint,
                  method,
                  data: payload,
                })
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
        setProducts((prev) =>
          prev.map((product) => (product.id === id ? { ...product, estado: current.estado } : product)),
        )
        console.log('Error al actualizar estado del producto:', error)
        return false
      }
    },
    [empresaID, products],
  )

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => {
      const target = prev.find((product) => product.id === id)
      if (target && isBlobUrl(target.image_url) && !revokedRef.current.has(target.image_url)) {
        URL.revokeObjectURL(target.image_url)
        revokedRef.current.add(target.image_url)
      }

      return prev.filter((product) => product.id !== id)
    })
  }, [])

  const replaceProductImage = useCallback((id: string, file: File) => {
    const nextImageUrl = URL.createObjectURL(file)

    setProducts((prev) =>
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
  }, [])

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    toggleProductStatus,
    removeProduct,
    replaceProductImage,
  }
}
