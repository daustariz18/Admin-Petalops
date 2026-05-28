import { apiClient } from './apiClient'
import { buildApiUrl } from './apiUrl'

export type Sucursal = {
  id_sucursal: number
  nombre: string
  empresa_id: number | string
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) return Number(value)
  return Number.NaN
}

function parseSucursal(payload: unknown): Sucursal | null {
  if (!payload || typeof payload !== 'object') return null

  const source = payload as Record<string, unknown>
  const id = toNumber(source.id_sucursal ?? source.idSucursal ?? source.id ?? source.sucursal_id)
  const nombre = String(source.nombre ?? source.name ?? '').trim()
  const empresa_id = source.empresa_id ?? source.empresaID ?? source.empresaId ?? source.companyId

  if (!Number.isFinite(id) || id <= 0) return null
  if (!nombre) return null

  return {
    id_sucursal: id,
    nombre,
    empresa_id: typeof empresa_id === 'number' || typeof empresa_id === 'string' ? empresa_id : '',
  }
}

function normalizeSucursalList(payload: unknown): Sucursal[] {
  const candidate = (() => {
    if (Array.isArray(payload)) return payload

    if (payload && typeof payload === 'object') {
      const source = payload as Record<string, unknown>
      if (Array.isArray(source.data)) return source.data
      if (Array.isArray(source.items)) return source.items
      if (Array.isArray(source.sucursales)) return source.sucursales
    }

    return []
  })()

  return candidate.map((item) => parseSucursal(item)).filter((item): item is Sucursal => item !== null)
}

export async function listSucursales(): Promise<Sucursal[]> {
  const response = await apiClient.get(buildApiUrl('/sucursales/'))
  return normalizeSucursalList(response.data)
}
