import { AxiosError } from 'axios'
import { apiClient } from './apiClient'
import { buildApiUrl } from './apiUrl'

export type BarrioStatus = 1 | 0

export type Barrio = {
  id_barrio: number
  empresa_id: number | string
  sucursal_id: number
  zona_id: number | null
  nombre_barrio: string
  costo_domicilio: number
  activo: BarrioStatus
  created_at: string
  updated_at: string | null
}

export type BarrioListFilters = {
  sucursal_id?: number
  zona_id?: number | null
  activo?: BarrioStatus | null
}

export type BarrioPayload = {
  sucursal_id: number
  nombre_barrio: string
  costo_domicilio: number
  zona_id?: number | null
  activo?: boolean | BarrioStatus
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data

    if (data && typeof data === 'object') {
      const detail = (data as { detail?: unknown }).detail
      if (typeof detail === 'string' && detail.trim()) {
        return detail
      }

      if (detail !== undefined) {
        return JSON.stringify(detail)
      }

      return JSON.stringify(data)
    }

    if (typeof data === 'string' && data.trim()) {
      return data
    }

    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Error desconocido.'
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) return Number(value)
  return Number.NaN
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = toNumber(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseBarrio(payload: unknown): Barrio | null {
  if (!payload || typeof payload !== 'object') return null

  const source = payload as Record<string, unknown>

  const id = toNumber(
    source.id_barrio ?? source.idBarrio ?? source.id ?? source.barrio_id ?? source.barrioID,
  )
  const empresa_id = source.empresa_id ?? source.empresaID ?? source.empresaId ?? source.companyId
  const sucursal_id = toNumber(source.sucursal_id ?? source.sucursalID ?? source.sucursalId)
  const zona_id = toNullableNumber(source.zona_id ?? source.zonaID ?? source.zonaId)
  const nombre_barrio = String(source.nombre_barrio ?? source.nombre ?? source.name ?? '').trim()
  const costo_domicilio = toNumber(source.costo_domicilio ?? source.costoDomicilio ?? source.costo)
  const rawActivo = source.activo ?? source.active ?? source.estado
  const activo =
    typeof rawActivo === 'boolean'
      ? (rawActivo ? 1 : 0)
      : typeof rawActivo === 'number'
        ? (rawActivo ? 1 : 0)
        : typeof rawActivo === 'string'
          ? ['1', 'true', 'activo', 'active', 'enabled', 'habilitado'].includes(rawActivo.trim().toLowerCase())
            ? 1
            : 0
          : 1
  const created_at = String(source.created_at ?? source.createdAt ?? source.created ?? '').trim()
  const updated_at_raw = source.updated_at ?? source.updatedAt ?? source.updated
  const updated_at =
    updated_at_raw === null || updated_at_raw === undefined || updated_at_raw === ''
      ? null
      : String(updated_at_raw).trim()

  if (!Number.isFinite(id) || id <= 0) return null
  if (!Number.isFinite(sucursal_id) || sucursal_id <= 0) return null
  if (!nombre_barrio) return null
  if (!Number.isFinite(costo_domicilio) || costo_domicilio < 0) return null
  if (!created_at) return null

  return {
    id_barrio: id,
    empresa_id: typeof empresa_id === 'number' || typeof empresa_id === 'string' ? empresa_id : '',
    sucursal_id,
    zona_id,
    nombre_barrio,
    costo_domicilio,
    activo: activo ? 1 : 0,
    created_at,
    updated_at,
  }
}

function normalizeBarrioList(payload: unknown): Barrio[] {
  const candidate = (() => {
    if (Array.isArray(payload)) return payload

    if (payload && typeof payload === 'object') {
      const source = payload as Record<string, unknown>
      if (Array.isArray(source.data)) return source.data
      if (Array.isArray(source.items)) return source.items
      if (Array.isArray(source.barrios)) return source.barrios
    }

    return []
  })()

  return candidate.map((item) => parseBarrio(item)).filter((item): item is Barrio => item !== null)
}

function buildBarrioQuery(filters?: BarrioListFilters): string {
  const params = new URLSearchParams()

  if (typeof filters?.sucursal_id === 'number' && Number.isFinite(filters.sucursal_id)) {
    params.set('sucursal_id', String(filters.sucursal_id))
  }

  if (filters?.zona_id !== undefined && filters?.zona_id !== null) {
    params.set('zona_id', String(filters.zona_id))
  }

  if (filters?.activo !== undefined && filters?.activo !== null) {
    params.set('activo', String(filters.activo))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function listBarrios(filters?: BarrioListFilters): Promise<Barrio[]> {
  const response = await apiClient.get(buildApiUrl(`/barrios${buildBarrioQuery(filters)}`))
  return normalizeBarrioList(response.data)
}

export async function createBarrio(payload: BarrioPayload): Promise<Barrio> {
  try {
    const response = await apiClient.post(buildApiUrl('/barrios'), {
      sucursal_id: payload.sucursal_id,
      nombre_barrio: payload.nombre_barrio,
      zona_id: payload.zona_id ?? null,
      costo_domicilio: payload.costo_domicilio,
      activo: payload.activo === undefined ? 1 : typeof payload.activo === 'boolean' ? (payload.activo ? 1 : 0) : payload.activo,
    })

    const parsed = parseBarrio(response.data)
    if (!parsed) {
      throw new Error('Respuesta invalida al crear barrio.')
    }
    return parsed
  } catch (error) {
    throw new Error(`No se pudo crear el barrio. ${extractErrorMessage(error)}`)
  }
}

export async function updateBarrio(id: number, payload: BarrioPayload): Promise<Barrio> {
  try {
    const response = await apiClient.put(buildApiUrl(`/barrios/${id}`), {
      sucursal_id: payload.sucursal_id,
      nombre_barrio: payload.nombre_barrio,
      zona_id: payload.zona_id ?? null,
      costo_domicilio: payload.costo_domicilio,
      activo: payload.activo === undefined ? 1 : typeof payload.activo === 'boolean' ? (payload.activo ? 1 : 0) : payload.activo,
    })

    const parsed = parseBarrio(response.data)
    if (!parsed) {
      throw new Error('Respuesta invalida al actualizar barrio.')
    }
    return parsed
  } catch (error) {
    throw new Error(`No se pudo actualizar el barrio. ${extractErrorMessage(error)}`)
  }
}

export async function updateBarrioStatus(id: number, activo: boolean): Promise<Barrio> {
  try {
    const response = await apiClient.patch(buildApiUrl(`/barrios/${id}/estado`), { activo })
    const parsed = parseBarrio(response.data)
    if (!parsed) {
      throw new Error('Respuesta invalida al actualizar el estado del barrio.')
    }
    return parsed
  } catch (error) {
    throw new Error(`No se pudo actualizar el estado del barrio. ${extractErrorMessage(error)}`)
  }
}

export async function deleteBarrio(id: number): Promise<void> {
  try {
    await apiClient.delete(buildApiUrl(`/barrios/${id}`))
  } catch (error) {
    throw new Error(`No se pudo eliminar el barrio. ${extractErrorMessage(error)}`)
  }
}
