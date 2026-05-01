import { apiClient } from './apiClient'

export type CategoryApiResponse = {
  id?: unknown
  name?: unknown
  nombre?: unknown
}

export type CategoryUpdateResult = {
  idCategoria: number
  nombre: string
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCategoryResponse(payload: unknown, fallbackId: number): CategoryUpdateResult | null {
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
  const idCategoria = Number(merged.id ?? fallbackId)
  const nombre = toStringOrEmpty(merged.nombre) || toStringOrEmpty(merged.name)

  if (!Number.isFinite(idCategoria) || idCategoria <= 0 || !nombre) {
    return null
  }

  return { idCategoria, nombre }
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
): Promise<CategoryUpdateResult> {
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
      { nombre: normalizedNombre },
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
