import { AxiosError } from 'axios'
import type {
  ConfirmProductImageRequest,
  ConfirmProductImageResponse,
  CreateProductRequest,
  CreateProductResponse,
  CreateProductResult,
} from '../types/product'
import { apiClient } from './apiClient'
import { buildProductsEndpoint, getProductsBasePath } from './productPaths'

const USE_MOCK = import.meta.env.VITE_USE_UPLOAD_MOCK === 'true'
const OPTIMIZED_IMAGE_MIME = 'image/webp'
const MAX_UPLOAD_DIMENSIONS = [1600, 1400, 1200, 1000, 800, 640, 480, 360] as const
const MAX_UPLOAD_SIZE_KB = 400
const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_KB * 1024
const UPLOAD_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.24, 0.18] as const

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number]

function normalizeMimeFromExtension(fileName: string): AcceptedMimeType | '' {
  const lower = fileName.trim().toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return ''
}

export function normalizeImageMimeType(file: File): string {
  const rawType = (file.type ?? '').trim().toLowerCase()

  if (!rawType || rawType === 'application/octet-stream' || rawType === 'binary/octet-stream') {
    return normalizeMimeFromExtension(file.name) || 'image/jpeg'
  }

  if (rawType === 'image/jpg') return 'image/jpeg'
  return rawType
}

export function validateImageFile(file: File): string | null {
  const normalizedType = normalizeImageMimeType(file)

  if (!normalizedType) {
    return 'No pudimos detectar el tipo de imagen. Usa JPG, PNG o WEBP.'
  }

  if (normalizedType === 'image/heic' || normalizedType === 'image/heif') {
    return `Formato no permitido (detectado: ${normalizedType}). Usa JPG, PNG o WEBP.`
  }

  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(normalizedType)) {
    return `Formato no permitido (detectado: ${normalizedType}). Usa JPG, PNG o WEBP.`
  }

  return null
}

function getResizedDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  const longestEdge = Math.max(width, height)
  if (longestEdge <= maxDimension) {
    return { width, height }
  }

  const scale = maxDimension / longestEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

function getUploadExtension(mimeType: string): string {
  if (mimeType === 'image/webp') return '.webp'
  return '.jpg'
}

export async function prepareImageFileForUpload(file: File): Promise<{ file: File; mimeType: string }> {
  const normalized = normalizeImageMimeType(file)

  try {
    const bitmap = await createImageBitmap(file)
    try {
      if (normalized === OPTIMIZED_IMAGE_MIME && file.size <= MAX_UPLOAD_BYTES) {
        return { file, mimeType: OPTIMIZED_IMAGE_MIME }
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo preparar el lienzo de conversion.')

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      for (const maxDimension of MAX_UPLOAD_DIMENSIONS) {
        const { width, height } = getResizedDimensions(bitmap.width, bitmap.height, maxDimension)
        canvas.width = width
        canvas.height = height
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(bitmap, 0, 0, width, height)

        for (const quality of UPLOAD_QUALITY_STEPS) {
          const blob = await canvasToBlob(canvas, OPTIMIZED_IMAGE_MIME, quality)
          if (!blob) continue

          if (blob.size <= MAX_UPLOAD_BYTES) {
            const baseName = file.name.replace(/\.[^.]+$/, '') || `foto-${Date.now()}`
            const convertedFile = new File([blob], `${baseName}${getUploadExtension(OPTIMIZED_IMAGE_MIME)}`, {
              type: OPTIMIZED_IMAGE_MIME,
              lastModified: Date.now(),
            })

            return { file: convertedFile, mimeType: OPTIMIZED_IMAGE_MIME }
          }
        }
      }

      throw new Error(`No se pudo reducir la imagen a ${MAX_UPLOAD_SIZE_KB} KB o menos.`)
    } finally {
      bitmap.close()
    }
  } catch {
    throw new Error(`No se pudo convertir la imagen a WebP de hasta ${MAX_UPLOAD_SIZE_KB} KB.`)
  }
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

function normalizeCreateProductResponse(
  payload: unknown,
  options: { allowMissingUpload?: boolean; allowMissingCodigo?: boolean } = {},
): CreateProductResponse | null {
  if (!payload || typeof payload !== 'object') return null

  const source = payload as Record<string, unknown>
  const nested =
    source.data && typeof source.data === 'object' ? (source.data as Record<string, unknown>) : null
  const merged = nested ? { ...source, ...nested } : source

  const id = Number(merged.id ?? merged.productoID ?? merged.productId ?? merged.productID)
  const codigoProducto = String(
    merged.codigo_producto ?? merged.codigoProducto ?? merged.codigo ?? '',
  ).trim()
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
  const allowMissingUpload = options.allowMissingUpload === true
  const allowMissingCodigo = options.allowMissingCodigo === true

  if (!Number.isFinite(id) || id <= 0) return null
  if (!codigoProducto && !allowMissingCodigo) return null
  if (!allowMissingUpload) {
    if (!uploadUrl || uploadUrl.toLowerCase() === 'undefined') return null
    if (!s3Key || s3Key.toLowerCase() === 'undefined') return null
  }

  return {
    id,
    codigo_producto: codigoProducto,
    uploadUrl,
    s3Key,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : 300,
  }
}

function hasValidUploadData(payload: Pick<CreateProductResponse, 'uploadUrl' | 's3Key'>): boolean {
  const uploadUrl = payload.uploadUrl?.trim()
  const s3Key = payload.s3Key?.trim()
  if (!uploadUrl || uploadUrl.toLowerCase() === 'undefined') return false
  if (!s3Key || s3Key.toLowerCase() === 'undefined') return false
  return true
}

async function getUploadUrlForProduct(
  empresaID: string,
  productoID: number,
  mimeType: string,
): Promise<Pick<CreateProductResponse, 'uploadUrl' | 's3Key' | 'expiresIn'>> {
  const base = getProductsBasePath()
  const pid = encodeURIComponent(String(productoID))
  const empresaQueryVariants = [`empresa_id=${encodeURIComponent(empresaID)}`, `empresaID=${encodeURIComponent(empresaID)}`]
  const mimeQueryVariants = [
    `mime_type=${encodeURIComponent(mimeType)}`,
    `mimeType=${encodeURIComponent(mimeType)}`,
    `content_type=${encodeURIComponent(mimeType)}`,
  ]

  const endpoints: string[] = []
  for (const empresaQuery of empresaQueryVariants) {
    for (const mimeQuery of mimeQueryVariants) {
      endpoints.push(`${base}/${pid}/upload-url?${empresaQuery}&${mimeQuery}`)
    }
    endpoints.push(`${base}/${pid}/upload-url?${empresaQuery}`)
  }
  for (const mimeQuery of mimeQueryVariants) {
    endpoints.push(`${base}/${pid}/upload-url?${mimeQuery}`)
  }

  const uniqueEndpoints = Array.from(new Set(endpoints))

  const failures: string[] = []

  for (const endpoint of uniqueEndpoints) {
    try {
      const response = await apiClient.get(endpoint, {
        headers: {
          'X-Empresa-Id': empresaID,
        },
      })
      const parsed = normalizeCreateProductResponse(response.data, {
        allowMissingUpload: false,
        allowMissingCodigo: true,
      })
      if (parsed && hasValidUploadData(parsed)) {
        return {
          uploadUrl: parsed.uploadUrl,
          s3Key: parsed.s3Key,
          expiresIn: parsed.expiresIn,
        }
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      const data = (error as { response?: { data?: unknown } })?.response?.data
      const serializedData =
        data === undefined
          ? ''
          : typeof data === 'string'
            ? data
            : JSON.stringify(data)
      failures.push(
        `${endpoint} -> status=${status ?? 'n/a'} body=${serializedData || 'n/a'}`,
      )
      if (status === 404 || status === 405 || status === 422 || status === 400) {
        continue
      }
      throw error
    }
  }

  throw new Error(
    `No fue posible obtener la URL de subida para la imagen. ${failures.join(' | ')}`,
  )
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
  mimeType?: string,
): Promise<CreateProductResponse> {
  const normalizedEmpresaID = empresaID.trim()

  if (!normalizedEmpresaID) {
    throw new Error('No se pudo identificar la tienda para guardar el producto.')
  }

  if (USE_MOCK) {
    await sleep(600)
    return {
      id: Math.floor(Math.random() * 900) + 100,
      codigo_producto: `MOCK-${Math.floor(Math.random() * 9000)
        .toString()
        .padStart(4, '0')}`,
      uploadUrl: 'https://mock-s3.local/upload/mock-key',
      s3Key: `productos/${normalizedEmpresaID}/mock-id/${crypto.randomUUID()}.webp`,
      expiresIn: 300,
    }
  }

  try {
    const endpoint = `${buildProductsEndpoint()}?empresa_id=${encodeURIComponent(normalizedEmpresaID)}`
    const createPayload = {
      name: payload.name,
      price: payload.price,
      category_id: payload.category_id,
      description: payload.description?.trim() || '.',
    }

    const response = await apiClient.post(endpoint, createPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const parsed = normalizeCreateProductResponse(response.data, {
      allowMissingUpload: true,
      allowMissingCodigo: true,
    })
    if (!parsed) {
      throw new Error(
        `[Crear producto] respuesta sin id/codigo_producto valido: ${JSON.stringify(response.data)}`,
      )
    }

    if (!hasValidUploadData(parsed)) {
      if (!mimeType) {
        throw new Error('No se pudo obtener la URL de subida para la imagen.')
      }

      const uploadData = await getUploadUrlForProduct(normalizedEmpresaID, parsed.id, mimeType)
      return {
        ...parsed,
        uploadUrl: uploadData.uploadUrl,
        s3Key: uploadData.s3Key,
        expiresIn: uploadData.expiresIn,
      }
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

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`La imagen final supera ${MAX_UPLOAD_SIZE_KB} KB y no se puede subir.`)
  }

  if (USE_MOCK) {
    await sleep(800)
    return
  }

  let response: Response

  try {
    response = await fetch(normalizedUrl, {
      method: 'PUT',
      body: file,
    })
  } catch (error) {
    throw new Error('No se pudo completar la subida de la foto por un problema de conexion.')
  }

  if (response.ok) {
    return
  }

  const errorText = await response.text().catch(() => '')

  if (response.status === 403) {
    throw new Error(
      `S3 rechazo la subida con 403 Forbidden. La firma puede no coincidir con el archivo enviado.${
        errorText ? ` Detalle: ${errorText}` : ''
      }`,
    )
  }

  throw new Error(
    `No se pudo subir la foto en este momento (status ${response.status}).${
      errorText ? ` Detalle: ${errorText}` : ''
    }`,
  )
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
    const endpoint = buildProductsEndpoint(String(productoID), 'confirm')
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
  const prepared = await prepareImageFileForUpload(file)

  onStepChange('creating')
  const created = await createProduct(empresaID, {
    ...productPayload,
  }, prepared.mimeType)

  onStepChange('uploading')
  await uploadToS3(created.uploadUrl, prepared.file)

  onStepChange('confirming')
  const confirmed = await confirmProductImage(created.id, {
    s3Key: created.s3Key,
  })

  return {
    id: confirmed.productoID,
    codigo_producto: created.codigo_producto,
    imagenUrl: confirmed.imagenUrl,
    imagenS3Key: confirmed.imagenS3Key,
  }
}
