import { useCallback, useEffect, useState } from 'react'
import { getStoredToken } from '../auth/authStorage'
import { apiClient } from '../services/apiClient'

export type Categoria = {
  idCategoria: number
  nombre: string
}

const RAW_API = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
const API = import.meta.env.DEV ? '' : RAW_API
const FALLBACK_CATEGORIAS_RAW =
  (import.meta.env.VITE_FALLBACK_CATEGORIAS as string | undefined)?.trim() ?? ''

function assertJsonContentType(contentType: string | null | undefined): void {
  if (!contentType?.includes('application/json')) {
    throw new Error('API returned HTML instead of JSON')
  }
}

function parseCategoria(value: unknown): Categoria | null {
  if (!value || typeof value !== 'object') return null

  const source = value as {
    idCategoria?: unknown
    id?: unknown
    categoriaID?: unknown
    nombre?: unknown
    name?: unknown
  }

  const rawId = source.idCategoria ?? source.id ?? source.categoriaID
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

  if (import.meta.env.DEV) {
    console.warn('[categorias] Respuesta no reconocida al crear categoría.', { payload })
  }

  return null
}

function normalizeCategorias(payload: unknown): Categoria[] {
  let sourceLabel = 'empty'

  const candidate = (() => {
    if (Array.isArray(payload)) {
      sourceLabel = 'array'
      return payload
    }

    if (payload && typeof payload === 'object') {
      const record = payload as { categorias?: unknown; data?: unknown; items?: unknown }
      if (Array.isArray(record.categorias)) {
        sourceLabel = 'categorias'
        return record.categorias
      }
      if (Array.isArray(record.data)) {
        sourceLabel = 'data'
        return record.data
      }
      if (Array.isArray(record.items)) {
        sourceLabel = 'items'
        return record.items
      }
    }

    return []
  })()

  const normalized = candidate
    .map((item) => parseCategoria(item))
    .filter((item): item is Categoria => item !== null)

  if (import.meta.env.DEV) {
    if (candidate.length > 0 && normalized.length === 0) {
      console.warn('[categorias] Payload recibido pero no se pudo normalizar.', {
        sourceLabel,
        payload,
      })
    } else if (normalized.length < candidate.length) {
      console.warn('[categorias] Algunos registros fueron descartados por formato inválido.', {
        sourceLabel,
        recibidos: candidate.length,
        validos: normalized.length,
        payload,
      })
    } else if (candidate.length === 0 && payload !== null && payload !== undefined) {
      console.warn('[categorias] Formato de respuesta no reconocido.', {
        sourceLabel,
        payload,
      })
    }
  }

  return normalized
}

function parseFallbackCategorias(raw: string): Categoria[] {
  if (!raw) return []

  try {
    const payload = JSON.parse(raw) as unknown
    return normalizeCategorias(payload)
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[categorias] VITE_FALLBACK_CATEGORIAS tiene JSON inválido.')
    }
    return []
  }
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriasLoading, setCategoriasLoading] = useState(false)
  const [categoriasError, setCategoriasError] = useState('')
  const [creatingCategoria, setCreatingCategoria] = useState(false)

  useEffect(() => {
    const loadCategorias = async () => {
      setCategoriasLoading(true)
      setCategoriasError('')

      try {
        const base = API.replace(/\/$/, '')
        const endpoint = `${base}/categorias`
        const token = getStoredToken()

        const headers: HeadersInit = {
          Accept: 'application/json',
        }

        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch(endpoint, {
          credentials: 'include',
          headers,
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Tu sesión expiró. Inicia sesión nuevamente para ver categorías.')
          }
          throw new Error(`No se pudieron cargar categorías (${response.status}).`)
        }

        const contentType = response.headers.get('content-type')
        const bodySample = await response.clone().text()

        if (bodySample.trim().startsWith('<')) {
          console.warn('[categorias] Invalid response format', response)
        }
        assertJsonContentType(contentType)

        let payload: unknown

        try {
          payload = JSON.parse(bodySample) as unknown
        } catch {
          console.warn('[categorias] Invalid response format', response)
          throw new Error('No se pudo interpretar la respuesta de categorías como JSON.')
        }

        setCategorias(normalizeCategorias(payload))
      } catch (error) {
        const fallback = parseFallbackCategorias(FALLBACK_CATEGORIAS_RAW)
        if (fallback.length > 0) {
          setCategorias(fallback)
          setCategoriasError(
            'No fue posible cargar categorías del backend. Se muestran categorías de respaldo.',
          )
        } else {
          setCategorias([])
          setCategoriasError(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las categorías. Intenta nuevamente.',
          )
        }
      } finally {
        setCategoriasLoading(false)
      }
    }

    void loadCategorias()
  }, [])

  const createCategoria = useCallback(async (nombre: string): Promise<Categoria> => {
    setCreatingCategoria(true)

    try {
      const response = await apiClient.post('/categorias', { nombre })
      const contentType = response.headers['content-type'] as string | undefined
      assertJsonContentType(contentType)

      const parsed = parseCreatedCategoriaResponse(response.data)

      if (!parsed) {
        throw new Error('Respuesta inválida al crear categoría.')
      }

      setCategorias((prev) => [...prev, parsed])
      return parsed
    } finally {
      setCreatingCategoria(false)
    }
  }, [])

  return {
    categorias,
    categoriasLoading,
    categoriasError,
    creatingCategoria,
    createCategoria,
  }
}
