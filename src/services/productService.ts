import { AxiosError } from 'axios'
import type {
  ConfirmProductImageRequest,
  ConfirmProductImageResponse,
  CreateProductRequest,
  CreateProductResponse,
  CreateProductResult,
} from '../types/product'
import { apiClient } from './apiClient'

const PRODUCTS_BASE_PATH =
  (import.meta.env.VITE_PRODUCTS_BASE_PATH as string | undefined)?.trim() ||
  '/admin/productos'

const USE_MOCK = import.meta.env.VITE_USE_UPLOAD_MOCK === 'true'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number]

const MAX_SIZE_BYTES = 5 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `Formato no permitido. Usa: ${ACCEPTED_MIME_TYPES.join(', ')}`
  }

  if (file.size > MAX_SIZE_BYTES) {
    return `El archivo supera 5 MB (tiene ${(file.size / 1024 / 1024).toFixed(2)} MB).`
  }

  return null
}

function extractAxiosErrorText(error: unknown): string {
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

function normalizeCreateProductResponse(payload: unknown): CreateProductResponse | null {
  if (!payload || typeof payload !== 'object') return null

  const source = payload as Record<string, unknown>
  const nested =
    source.data && typeof source.data === 'object' ? (source.data as Record<string, unknown>) : null
  const merged = nested ? { ...source, ...nested } : source

  const productoID = Number(
    merged.productoID ?? merged.productId ?? merged.productID ?? merged.id,
  )
  const uploadUrl = String(
    merged.uploadUrl ??
      merged.upload_url ??
      merged.signedUrl ??
      merged.signed_url ??
      merged.presignedUrl ??
      merged.url ??
      '',
  ).trim()
  const s3Key = String(
    merged.s3Key ?? merged.s3_key ?? merged.key ?? merged.objectKey ?? '',
  ).trim()
  const expiresIn = Number(merged.expiresIn ?? merged.expires_in ?? 300)

  if (!Number.isFinite(productoID) || productoID <= 0) return null
  if (!uploadUrl || uploadUrl.toLowerCase() === 'undefined') return null
  if (!s3Key || s3Key.toLowerCase() === 'undefined') return null

  return {
    productoID,
    uploadUrl,
    s3Key,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : 300,
  }
}

function normalizeConfirmProductImageResponse(
  productoID: number,
  payload: unknown,
  s3Key: string,
): ConfirmProductImageResponse {
  if (payload && typeof payload === 'object') {
    const source = payload as Record<string, unknown>
    const nested =
      source.data && typeof source.data === 'object' ? (source.data as Record<string, unknown>) : null
    const merged = nested ? { ...source, ...nested } : source

    const resolvedProductoID = Number(
      merged.productoID ?? merged.productId ?? merged.productID ?? merged.id ?? productoID,
    )
    const resolvedS3Key = String(
      merged.imagenS3Key ?? merged.s3Key ?? merged.s3_key ?? s3Key,
    ).trim()
    const resolvedImagenUrl = String(
      merged.imagenUrl ?? merged.url ?? merged.imageUrl ?? '',
    ).trim()

    return {
      productoID:
        Number.isFinite(resolvedProductoID) && resolvedProductoID > 0
          ? resolvedProductoID
          : productoID,
      imagenS3Key: resolvedS3Key || s3Key,
      imagenUrl: resolvedImagenUrl,
    }
  }

  return {
    productoID,
    imagenS3Key: s3Key,
    imagenUrl: '',
  }
}

export async function createProduct(
  empresaID: string,
  payload: CreateProductRequest,
): Promise<CreateProductResponse> {
  const normalizedEmpresaID = empresaID.trim()

  if (!normalizedEmpresaID) {
    throw new Error('No se pudo identificar la tienda para guardar el producto.')
  }

  if (USE_MOCK) {
    await sleep(600)
    return {
      productoID: Math.floor(Math.random() * 900) + 100,
      uploadUrl: 'https://mock-s3.local/upload/mock-key',
      s3Key: `productos/${normalizedEmpresaID}/mock-id/${crypto.randomUUID()}.jpg`,
      expiresIn: 300,
    }
  }

  try {
    const endpoint = `${PRODUCTS_BASE_PATH.replace(/\/$/, '')}?empresa_id=${encodeURIComponent(normalizedEmpresaID)}`
    const createPayload = {
      nombre: payload.nombre,
      precio: payload.precio,
      categoriaID: payload.categoriaID,
      descripcion: payload.descripcion?.trim() || '.',
      mimeType: payload.mimeType,
    }

    const response = await apiClient.post(endpoint, createPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const parsed = normalizeCreateProductResponse(response.data)
    if (!parsed) {
      throw new Error(
        `[Crear producto] respuesta sin uploadUrl/s3Key/productoID validos: ${JSON.stringify(response.data)}`,
      )
    }

    return parsed
  } catch (error) {
    throw new Error(`No se pudo guardar el producto. ${extractAxiosErrorText(error)}`)
  }
}

export async function uploadToS3(signedUrl: string, file: File): Promise<void> {
  const normalizedUrl = (signedUrl ?? '').trim()

  if (!normalizedUrl || normalizedUrl.toLowerCase() === 'undefined' || normalizedUrl.endsWith('/undefined')) {
    throw new Error('No se pudo preparar la subida de la foto. Intenta nuevamente.')
  }

  if (USE_MOCK) {
    await sleep(800)
    return
  }

  try {
    const response = await fetch(normalizedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')

      if (response.status === 403) {
        throw new Error(
          'No se pudo subir la foto por un problema de permisos. Intenta de nuevo en unos segundos.',
        )
      }

      throw new Error(
        `No se pudo subir la foto en este momento.${errorText ? ` Detalle: ${errorText}` : ''}`,
      )
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'No se pudo completar la subida de la foto por un problema de conexion.',
      )
    }

    throw error
  }
}

export async function confirmProductImage(
  productoID: number,
  payload: ConfirmProductImageRequest,
): Promise<ConfirmProductImageResponse> {
  if (USE_MOCK) {
    await sleep(400)
    return {
      productoID,
      imagenS3Key: payload.s3Key,
      imagenUrl: `https://cdn.mock-petalops.local/${payload.s3Key}`,
    }
  }

  try {
    const endpoint = `${PRODUCTS_BASE_PATH.replace(/\/$/, '')}/${productoID}/confirm`
    const response = await apiClient.post(
      endpoint,
      { s3Key: payload.s3Key },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    return normalizeConfirmProductImageResponse(productoID, response.data, payload.s3Key)
  } catch (error) {
    throw new Error(`No se pudo finalizar el guardado de la foto. ${extractAxiosErrorText(error)}`)
  }
}

export async function createProductWithImage(
  empresaID: string,
  productPayload: CreateProductRequest,
  file: File,
  onStepChange: (step: 'creating' | 'uploading' | 'confirming') => void,
): Promise<CreateProductResult> {
  onStepChange('creating')
  const created = await createProduct(empresaID, productPayload)

  onStepChange('uploading')
  await uploadToS3(created.uploadUrl, file)

  onStepChange('confirming')
  const confirmed = await confirmProductImage(created.productoID, {
    s3Key: created.s3Key,
  })

  return {
    productoID: confirmed.productoID,
    imagenUrl: confirmed.imagenUrl,
    imagenS3Key: confirmed.imagenS3Key,
  }
}
