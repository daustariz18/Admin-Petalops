import { useCallback, useEffect, useState } from 'react'
import { getStoredToken } from '../auth/authStorage'
import { apiClient } from '../services/apiClient'

export type Categoria = {
  idCategoria: number
  nombre: string
}

const FALLBACK_CATEGORIAS_RAW =
  (import.meta.env.VITE_FALLBACK_CATEGORIAS as string | undefined)?.trim() ?? ''
const USE_UPLOAD_MOCK = import.meta.env.VITE_USE_UPLOAD_MOCK === 'true'

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
    console.warn('[categorias] Respuesta no reconocida al crear categoria.', { payload })
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
      console.warn('[categorias] Algunos registros fueron descartados por formato invalido.', {
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
      console.warn('[categorias] VITE_FALLBACK_CATEGORIAS tiene JSON invalido.')
    }
    return []
  }
}

export function useCategorias(empresaID?: string) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriasLoading, setCategoriasLoading] = useState(false)
  const [categoriasError, setCategoriasError] = useState('')
  const [creatingCategoria, setCreatingCategoria] = useState(false)

  useEffect(() => {
    const loadCategorias = async () => {
      const normalizedEmpresaID = empresaID?.trim() ?? ''

      if (!normalizedEmpresaID) {
        setCategorias([])
        setCategoriasError('No se pudo identificar la tienda para cargar categorias.')
        return
      }

      setCategoriasLoading(true)
      setCategoriasError('')

      try {
        const queryValue = encodeURIComponent(normalizedEmpresaID)
        const endpoints = [
          `/categorias?empresa_id=${queryValue}`,
          `/categorias?empresaID=${queryValue}`,
          `/admin/categorias?empresa_id=${queryValue}`,
        ]
        const token = getStoredToken()

        const headers: HeadersInit = {
          Accept: 'application/json',
          'X-Empresa-Id': normalizedEmpresaID,
        }

        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

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
          throw new Error('No se encontro un endpoint de categorias compatible.')
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
          throw new Error('No se pudo interpretar la respuesta de categorias como JSON.')
        }

        const normalized = normalizeCategorias(payload)
        setCategorias(normalized)
        if (normalized.length === 0) {
          setCategoriasError('No hay categorias registradas para esta tienda.')
        }
      } catch (error) {
        const fallback = USE_UPLOAD_MOCK ? parseFallbackCategorias(FALLBACK_CATEGORIAS_RAW) : []
        if (fallback.length > 0) {
          setCategorias(fallback)
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
          endpoint,
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
          return [...prev, parsed]
        })
        setCategoriasError('')
        return parsed
      } finally {
        setCreatingCategoria(false)
      }
    },
    [empresaID],
  )

  return {
    categorias,
    categoriasLoading,
    categoriasError,
    creatingCategoria,
    createCategoria,
  }
}
