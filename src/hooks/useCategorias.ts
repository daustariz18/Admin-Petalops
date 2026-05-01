import { useCallback, useEffect, useState } from 'react'
import { getStoredToken } from '../auth/authStorage'
import { apiClient } from '../services/apiClient'
import { buildApiUrl } from '../services/apiUrl'
import { updateCategory as updateCategoryRequest } from '../services/categoryService'

export type Categoria = {
  idCategoria: number
  nombre: string
}

type CategoryCacheEntry = {
  items: Categoria[]
  loadedAt: number
}

const FALLBACK_CATEGORIAS_RAW =
  (import.meta.env.VITE_FALLBACK_CATEGORIAS as string | undefined)?.trim() ?? ''
const USE_UPLOAD_MOCK = import.meta.env.VITE_USE_UPLOAD_MOCK === 'true'
const categoriasCache = new Map<string, CategoryCacheEntry>()

function assertJsonContentType(contentType: string | null | undefined): void {
  if (!contentType?.includes('application/json')) {
    throw new Error('API returned HTML instead of JSON')
  }
}

function parseCategoria(value: unknown): Categoria | null {
  if (!value || typeof value !== 'object') return null

  const source = value as {
    idCategoria?: unknown
    id_categoria?: unknown
    id?: unknown
    categoriaID?: unknown
    categoria_id?: unknown
    nombre?: unknown
    name?: unknown
  }

  const rawId =
    source.idCategoria ?? source.id_categoria ?? source.id ?? source.categoriaID ?? source.categoria_id
  const rawNombre = source.nombre ?? source.name

  const idCategoria = Number(rawId)
  const nombre = typeof rawNombre === 'string' ? rawNombre.trim() : ''

  if (!Number.isFinite(idCategoria) || idCategoria <= 0 || !nombre) {
    return null
  }

  return { idCategoria, nombre }
}

function parseCreatedCategoriaResponse(payload: unknown): Categoria | null {
  const direct = parseCategoria(payload)
  if (direct) return direct

  if (payload && typeof payload === 'object') {
    const record = payload as { categoria?: unknown; data?: unknown; item?: unknown }

    const fromCategoria = parseCategoria(record.categoria)
    if (fromCategoria) return fromCategoria

    const fromData = parseCategoria(record.data)
    if (fromData) return fromData

    const fromItem = parseCategoria(record.item)
    if (fromItem) return fromItem
  }

  return null
}

function normalizeCategorias(payload: unknown): Categoria[] {
  const candidate = (() => {
    if (Array.isArray(payload)) {
      return payload
    }

    if (payload && typeof payload === 'object') {
      const record = payload as { categorias?: unknown; data?: unknown; items?: unknown }
      if (Array.isArray(record.categorias)) {
        return record.categorias
      }
      if (Array.isArray(record.data)) {
        return record.data
      }
      if (Array.isArray(record.items)) {
        return record.items
      }
    }

    return []
  })()

  const normalized = candidate
    .map((item) => parseCategoria(item))
    .filter((item): item is Categoria => item !== null)

  return normalized
}

function parseFallbackCategorias(raw: string): Categoria[] {
  if (!raw) return []

  try {
    const payload = JSON.parse(raw) as unknown
    return normalizeCategorias(payload)
  } catch {
    return []
  }
}

function buildCategoryEndpoints(empresaID: string): string[] {
  const queryValue = encodeURIComponent(empresaID)
  return [
    buildApiUrl(`/categorias?empresa_id=${queryValue}`),
    buildApiUrl(`/categorias?empresaID=${queryValue}`),
    buildApiUrl('/categorias'),
    buildApiUrl(`/categories?empresa_id=${queryValue}`),
    buildApiUrl(`/categories?empresaID=${queryValue}`),
    buildApiUrl('/categories'),
  ]
}

function getCachedCategorias(empresaID: string): Categoria[] | null {
  const cached = categoriasCache.get(empresaID)
  return cached?.items ?? null
}

function storeCategoriasCache(empresaID: string, items: Categoria[]): void {
  categoriasCache.set(empresaID, {
    items,
    loadedAt: Date.now(),
  })
}

export function useCategorias(empresaID?: string) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriasLoading, setCategoriasLoading] = useState(false)
  const [categoriasError, setCategoriasError] = useState('')
  const [creatingCategoria, setCreatingCategoria] = useState(false)
  const [updatingCategoria, setUpdatingCategoria] = useState(false)

  useEffect(() => {
    const loadCategorias = async () => {
      const normalizedEmpresaID = empresaID?.trim() ?? ''

      if (!normalizedEmpresaID) {
        setCategorias([])
        setCategoriasError('No se pudo identificar la tienda para cargar categorias.')
        return
      }

      const cached = getCachedCategorias(normalizedEmpresaID)
      if (cached) {
        setCategorias(cached)
        setCategoriasError('')
        return
      }

      setCategoriasLoading(true)
      setCategoriasError('')

      try {
        const token = getStoredToken()
        const headers: HeadersInit = {
          Accept: 'application/json',
          'X-Empresa-Id': normalizedEmpresaID,
        }

        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const endpoints = buildCategoryEndpoints(normalizedEmpresaID)
        let response: Response | null = null

        for (const endpoint of endpoints) {
          const current = await fetch(endpoint, {
            credentials: 'include',
            headers,
          })

          if (current.ok) {
            response = current
            break
          }

          if (current.status === 401) {
            throw new Error('Tu sesion expiro. Inicia sesion nuevamente para ver categorias.')
          }

          if (current.status !== 404) {
            throw new Error(`No se pudieron cargar categorias (${current.status}).`)
          }
        }

        if (!response) {
          const fallback = USE_UPLOAD_MOCK ? parseFallbackCategorias(FALLBACK_CATEGORIAS_RAW) : []
          if (fallback.length > 0) {
            setCategorias(fallback)
            storeCategoriasCache(normalizedEmpresaID, fallback)
            setCategoriasError(
              'No fue posible cargar categorias del backend. Se muestran categorias de respaldo.',
            )
            return
          }

          throw new Error('No se encontro un endpoint de categorias compatible.')
        }

        const contentType = response.headers.get('content-type')
        const bodySample = await response.clone().text()

        assertJsonContentType(contentType)

        let payload: unknown

        try {
          payload = JSON.parse(bodySample) as unknown
        } catch {
          throw new Error('No se pudo interpretar la respuesta de categorias como JSON.')
        }

        const normalized = normalizeCategorias(payload)
        setCategorias(normalized)
        storeCategoriasCache(normalizedEmpresaID, normalized)
        if (normalized.length === 0) {
          setCategoriasError('No hay categorias registradas para esta tienda.')
        }
      } catch (error) {
        const fallback = USE_UPLOAD_MOCK ? parseFallbackCategorias(FALLBACK_CATEGORIAS_RAW) : []
        if (fallback.length > 0) {
          setCategorias(fallback)
          storeCategoriasCache(normalizedEmpresaID, fallback)
          setCategoriasError(
            'No fue posible cargar categorias del backend. Se muestran categorias de respaldo.',
          )
        } else {
          setCategorias([])
          setCategoriasError(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las categorias. Intenta nuevamente.',
          )
        }
      } finally {
        setCategoriasLoading(false)
      }
    }

    void loadCategorias()
  }, [empresaID])

  const createCategoria = useCallback(
    async (nombre: string): Promise<Categoria> => {
      const normalizedEmpresaID = empresaID?.trim() ?? ''
      if (!normalizedEmpresaID) {
        throw new Error('No se pudo identificar la tienda para crear la categoria.')
      }

      setCreatingCategoria(true)

      try {
        const endpoint = `/categorias?empresa_id=${encodeURIComponent(normalizedEmpresaID)}`
        const response = await apiClient.post(
          buildApiUrl(endpoint),
          { nombre, empresaID: normalizedEmpresaID },
          {
            headers: {
              'X-Empresa-Id': normalizedEmpresaID,
            },
          },
        )
        const contentType = response.headers['content-type'] as string | undefined
        assertJsonContentType(contentType)

        const parsed = parseCreatedCategoriaResponse(response.data)

        if (!parsed) {
          throw new Error('Respuesta invalida al crear categoria.')
        }

        setCategorias((prev) => {
          if (prev.some((item) => item.idCategoria === parsed.idCategoria)) {
            return prev
          }
          const next = [...prev, parsed]
          storeCategoriasCache(normalizedEmpresaID, next)
          return next
        })
        setCategoriasError('')
        return parsed
      } finally {
        setCreatingCategoria(false)
      }
    },
    [empresaID],
  )

  const updateCategoria = useCallback(
    async (idCategoria: number, nombre: string): Promise<Categoria> => {
      const normalizedEmpresaID = empresaID?.trim() ?? ''

      if (!normalizedEmpresaID) {
        throw new Error('No se pudo identificar la tienda para actualizar la categoria.')
      }

      setUpdatingCategoria(true)

      try {
        const updated = await updateCategoryRequest(idCategoria, nombre, normalizedEmpresaID)
        const nextCategoria: Categoria = {
          idCategoria: updated.idCategoria,
          nombre: updated.nombre,
        }

        setCategorias((prev) =>
          prev.map((categoria) =>
            categoria.idCategoria === idCategoria ? nextCategoria : categoria,
          ),
        )
        storeCategoriasCache(
          normalizedEmpresaID,
          categorias.map((categoria) =>
            categoria.idCategoria === idCategoria ? nextCategoria : categoria,
          ),
        )
        setCategoriasError('')
        return nextCategoria
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : 'No se pudo actualizar la categoria.'
        throw new Error(message)
      } finally {
        setUpdatingCategoria(false)
      }
    },
    [empresaID, categorias],
  )

  return {
    categorias,
    categoriasLoading,
    categoriasError,
    creatingCategoria,
    updatingCategoria,
    createCategoria,
    updateCategoria,
  }
}
