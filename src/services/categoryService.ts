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
  orden_catalogo?: unknown
  ordenCatalogo?: unknown
  orden?: unknown
  position?: unknown
}

export type CategoryStatus = 'activo' | 'inactivo'

export type CategoryResult = {
  idCategoria: number
  nombre: string
  active?: boolean
  activo?: boolean
  estado?: CategoryStatus
  orden_catalogo?: number
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
  const ordenCatalogo = Number(
    merged.orden_catalogo ?? merged.ordenCatalogo ?? merged.orden ?? merged.position,
  )

  if (!Number.isFinite(idCategoria) || idCategoria <= 0 || !nombre) {
    return null
  }

  return {
    idCategoria,
    nombre,
    active,
    activo,
    estado,
    orden_catalogo: Number.isFinite(ordenCatalogo) ? ordenCatalogo : undefined,
  }
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

export async function updateCategoryOrder(
  categorias: Array<{ idCategoria: number; orden_catalogo: number }>,
  empresaID?: string,
): Promise<void> {
  const normalizedEmpresaID = empresaID?.trim() ?? ''
  const ordered = categorias.filter(
    (categoria) =>
      Number.isFinite(categoria.idCategoria) &&
      categoria.idCategoria > 0 &&
      Number.isFinite(categoria.orden_catalogo),
  )

  if (!normalizedEmpresaID) {
    throw new Error('No se pudo identificar la tienda para ordenar las categorias.')
  }

  if (ordered.length === 0) {
    throw new Error('No hay categorias validas para ordenar.')
  }

  const headers = {
    'X-Empresa-Id': normalizedEmpresaID,
  }
  const query = `empresa_id=${encodeURIComponent(normalizedEmpresaID)}`
  const endpoints = [
    `/categorias/orden?${query}`,
    `/categorias/reordenar?${query}`,
    `/categorias/order?${query}`,
  ]
  const payload = {
    empresaID: normalizedEmpresaID,
    empresa_id: normalizedEmpresaID,
    categorias: ordered,
    orden: ordered.map((categoria) => ({
      idCategoria: categoria.idCategoria,
      id_categoria: categoria.idCategoria,
      orden_catalogo: categoria.orden_catalogo,
      orden: categoria.orden_catalogo,
    })),
  }

  for (const endpoint of endpoints) {
    try {
      await apiClient.patch(endpoint, payload, { headers })
      return
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 405 || status === 422 || status === 400) {
        continue
      }
      throw error
    }
  }

  throw new Error('El backend aun no tiene un endpoint compatible para ordenar categorias.')
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
