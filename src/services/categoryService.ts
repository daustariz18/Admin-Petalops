import { apiClient } from './apiClient'

export type CategoryApiResponse = {
  id?: unknown
  idCategoria?: unknown
  id_categoria?: unknown
  categoriaID?: unknown
  categoria_id?: unknown
  name?: unknown
  nombre?: unknown
  active?: unknown
  activo?: unknown
  estado?: unknown
  status?: unknown
}

export type CategoryStatus = 'activo' | 'inactivo'

export type CategoryResult = {
  idCategoria: number
  nombre: string
  active?: boolean
  activo?: boolean
  estado?: CategoryStatus
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCategoryStatus(value: unknown): CategoryStatus | undefined {
  if (typeof value === 'boolean') return value ? 'activo' : 'inactivo'

  const raw = toStringOrEmpty(value).toLowerCase()
  if (!raw) return undefined

  if (['activo', 'active', '1', 'true', 'enabled', 'habilitado'].includes(raw)) {
    return 'activo'
  }

  if (['inactivo', 'inactive', '0', 'false', 'disabled', 'deshabilitado'].includes(raw)) {
    return 'inactivo'
  }

  return undefined
}

function normalizeCategoryResponse(payload: unknown, fallbackId: number): CategoryResult | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as CategoryApiResponse & {
    data?: unknown
    categoria?: unknown
    item?: unknown
  }

  const nested =
    record.data && typeof record.data === 'object'
      ? (record.data as CategoryApiResponse)
      : record.categoria && typeof record.categoria === 'object'
        ? (record.categoria as CategoryApiResponse)
        : record.item && typeof record.item === 'object'
          ? (record.item as CategoryApiResponse)
          : null

  const merged = nested ? { ...record, ...nested } : record
  const idCategoria = Number(
    merged.id ??
      merged.idCategoria ??
      merged.id_categoria ??
      merged.categoriaID ??
      merged.categoria_id ??
      fallbackId,
  )
  const nombre = toStringOrEmpty(merged.nombre) || toStringOrEmpty(merged.name)
  const estado = normalizeCategoryStatus(merged.estado ?? merged.status ?? merged.activo ?? merged.active)
  const active =
    typeof merged.active === 'boolean'
      ? merged.active
      : typeof merged.activo === 'boolean'
        ? merged.activo
        : estado
          ? estado === 'activo'
          : undefined
  const activo = typeof merged.activo === 'boolean' ? merged.activo : active

  if (!Number.isFinite(idCategoria) || idCategoria <= 0 || !nombre) {
    return null
  }

  return { idCategoria, nombre, active, activo, estado }
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData.trim()
  }

  if (responseData && typeof responseData === 'object') {
    const record = responseData as {
      detail?: unknown
      message?: unknown
      error?: unknown
      mensaje?: unknown
      nombre?: unknown
    }

    const candidate =
      toStringOrEmpty(record.detail) ||
      toStringOrEmpty(record.message) ||
      toStringOrEmpty(record.error) ||
      toStringOrEmpty(record.mensaje) ||
      toStringOrEmpty(record.nombre)

    if (candidate) return candidate
    return JSON.stringify(responseData)
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export async function updateCategory(
  idCategoria: number,
  nombre: string,
  empresaID?: string,
): Promise<CategoryResult> {
  const normalizedNombre = nombre.trim()
  const normalizedEmpresaID = empresaID?.trim() ?? ''

  if (!Number.isFinite(idCategoria) || idCategoria <= 0) {
    throw new Error('No se pudo identificar la categoria a actualizar.')
  }

  if (!normalizedNombre) {
    throw new Error('El nombre de la categoria no puede estar vacio.')
  }

  try {
    const response = await apiClient.patch(
      `/categorias/${encodeURIComponent(String(idCategoria))}`,
      { nombre: normalizedNombre, name: normalizedNombre },
      {
        headers: {
          ...(normalizedEmpresaID ? { 'X-Empresa-Id': normalizedEmpresaID } : {}),
        },
      },
    )

    const parsed = normalizeCategoryResponse(response.data, idCategoria)
    if (!parsed) {
      throw new Error('Respuesta invalida al actualizar categoria.')
    }

    return parsed
  } catch (error) {
    throw new Error(`No se pudo actualizar la categoria. ${extractErrorMessage(error, 'Error desconocido.')}`)
  }
}

export async function updateCategoryStatus(
  idCategoria: number,
  active: boolean,
  empresaID?: string,
): Promise<CategoryResult> {
  const normalizedEmpresaID = empresaID?.trim() ?? ''

  if (!Number.isFinite(idCategoria) || idCategoria <= 0) {
    throw new Error('No se pudo identificar la categoria a actualizar.')
  }

  if (!normalizedEmpresaID) {
    throw new Error('No se pudo identificar la tienda para actualizar la categoria.')
  }

  try {
    const response = await apiClient.patch(
      `/categorias/${encodeURIComponent(String(idCategoria))}/estado`,
      { active, activo: active },
      {
        headers: {
          ...(normalizedEmpresaID ? { 'X-Empresa-Id': normalizedEmpresaID } : {}),
        },
      },
    )

    const parsed = normalizeCategoryResponse(response.data, idCategoria)
    if (!parsed) {
      return {
        idCategoria,
        nombre: '',
        active,
        activo: active,
        estado: active ? 'activo' : 'inactivo',
      }
    }

    return {
      ...parsed,
      active: parsed.active ?? active,
      activo: parsed.activo ?? active,
      estado: parsed.estado ?? (active ? 'activo' : 'inactivo'),
    }
  } catch (error) {
    throw new Error(`No se pudo actualizar el estado de la categoria. ${extractErrorMessage(error, 'Error desconocido.')}`)
  }
}

export async function deleteCategory(idCategoria: number, empresaID?: string): Promise<void> {
  const normalizedEmpresaID = empresaID?.trim() ?? ''

  if (!Number.isFinite(idCategoria) || idCategoria <= 0) {
    throw new Error('No se pudo identificar la categoria a eliminar.')
  }

  try {
    await apiClient.delete(`/categorias/${encodeURIComponent(String(idCategoria))}`, {
      headers: {
        ...(normalizedEmpresaID ? { 'X-Empresa-Id': normalizedEmpresaID } : {}),
      },
    })
  } catch (error) {
    throw error
  }
}
