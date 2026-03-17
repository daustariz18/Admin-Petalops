/**
 * productService.ts
 *
 * Funciones puras de API para el flujo "crear producto con imagen".
 * Ninguna importa estado React; son testeables de forma aislada.
 *
 * Flujo:
 *   createProduct()  →  uploadToS3()  →  confirmProductImage()
 * Orquestación completa: createProductWithImage()
 */

import type {
  ConfirmProductImageRequest,
  ConfirmProductImageResponse,
  CreateProductRequest,
  CreateProductResponse,
  CreateProductResult,
} from '../types/product'
import { AxiosError } from 'axios'
import { apiClient } from './apiClient'

const PRODUCTS_BASE_PATH =
  (import.meta.env.VITE_PRODUCTS_BASE_PATH as string | undefined)?.trim() ||
  '/admin/productos'

function getAlternativePath(path: string): string {
  if (path.endsWith('/')) {
    return path.slice(0, -1)
  }

  return `${path}/`
}

function getPathVariants(path: string): string[] {
  const normalized = path.trim() || '/admin/producto'
  const variants = new Set<string>()

  variants.add(normalized)
  variants.add(getAlternativePath(normalized))

  if (normalized.includes('/producto')) {
    const plural = normalized.replace('/producto', '/productos')
    variants.add(plural)
    variants.add(getAlternativePath(plural))
  }

  if (normalized.includes('/productos')) {
    const singular = normalized.replace('/productos', '/producto')
    variants.add(singular)
    variants.add(getAlternativePath(singular))
  }

  return Array.from(variants)
}

// Mock mode: si VITE_USE_UPLOAD_MOCK=true no se hace ninguna llamada de red.
const USE_MOCK = import.meta.env.VITE_USE_UPLOAD_MOCK === 'true'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Validación de archivo ─────────────────────────────────────────────────────

export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number]

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

/** Valida tipo MIME y tamaño cliente antes de tocar la red. Devuelve null si ok. */
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `Formato no permitido. Usa: ${ACCEPTED_MIME_TYPES.join(', ')}`
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `El archivo supera 5 MB (tiene ${(file.size / 1024 / 1024).toFixed(2)} MB).`
  }
  return null
}

// ── Helper interno ────────────────────────────────────────────────────────────

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

// ── Funciones puras de API ────────────────────────────────────────────────────

/**
 * Step 1 – Crea el producto en backend.
 * La empresa va en el header X-Empresa-Id, NO en el body.
 * Devuelve productoID + signed URL para subir la imagen directo a S3.
 */
export async function createProduct(
  empresaID: string,
  payload: CreateProductRequest,
): Promise<CreateProductResponse> {
  const normalizedEmpresaID = empresaID.trim()

  if (!normalizedEmpresaID) {
    throw new Error('[Crear producto] Header X-Empresa-Id es requerido.')
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
    const candidatePaths = getPathVariants(PRODUCTS_BASE_PATH)
    console.info('[createProduct] rutas candidatas:', candidatePaths)

    for (const candidatePath of candidatePaths) {
      try {
        console.info('[createProduct] probando ruta:', candidatePath)
        const response = await apiClient.post<CreateProductResponse>(candidatePath, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Empresa-Id': normalizedEmpresaID,
          },
        })

        console.info('[createProduct] ruta exitosa:', candidatePath)

        return response.data
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
          console.warn('[createProduct] 404 en ruta:', candidatePath)
          continue
        }

        throw new Error(
          `[Crear producto] fallo en ruta ${candidatePath}: ${extractAxiosErrorText(error)}`,
        )
      }
    }

    throw new Error(
      `[Crear producto] 404 en rutas probadas: ${candidatePaths.join(', ')}. Ajusta VITE_PRODUCTS_BASE_PATH.`,
    )
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`[Crear producto] ${extractAxiosErrorText(error)}`)
  }
}

/**
 * Step 2 – Sube el archivo binario directo a S3 con la signed URL.
 * No llama al API propio. Si este paso falla, NO se debe llamar confirmación.
 */
export async function uploadToS3(signedUrl: string, file: File): Promise<void> {
  if (USE_MOCK) {
    await sleep(800)
    return
  }

  try {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.log(response.status, errorText)

      if (response.status === 403) {
        throw new Error(
          '[Subir a S3] S3 rechazo la URL firmada (403). Revisa expiracion de URL, permisos IAM/bucket policy y que el Content-Type firmado coincida con el enviado.',
        )
      }

      throw new Error(
        `[Subir a S3] ${response.status}: no fue posible subir la imagen.${errorText ? ` Detalle: ${errorText}` : ''}`,
      )
    }
  } catch (error) {
    // Cuando fetch falla en preflight/handshake, el navegador suele lanzar TypeError.
    if (error instanceof TypeError) {
      throw new Error(
        '[Subir a S3] El navegador bloqueo la subida (CORS/red). Verifica CORS del bucket para permitir PUT desde este origen.',
      )
    }
    throw error
  }
}

/**
 * Step 3 – Confirma la imagen en backend.
 * productoID viene de la respuesta del step 1; nunca se pide al usuario.
 */
export async function confirmProductImage(
  empresaID: string,
  productoID: number,
  payload: ConfirmProductImageRequest,
): Promise<ConfirmProductImageResponse> {
  const normalizedEmpresaID = empresaID.trim()

  if (!normalizedEmpresaID) {
    throw new Error('[Confirmar imagen] Header X-Empresa-Id es requerido.')
  }

  if (USE_MOCK) {
    await sleep(400)
    return {
      productoID,
      imagenS3Key: payload.s3Key,
      imagenUrl: `https://cdn.mock-petalops.local/${payload.s3Key}`,
    }
  }

  try {
    const candidatePaths = getPathVariants(PRODUCTS_BASE_PATH).map(
      (basePath) => `${basePath.replace(/\/$/, '')}/${productoID}/imagen`,
    )
    console.info('[confirmProductImage] rutas candidatas:', candidatePaths)

    for (const candidatePath of candidatePaths) {
      try {
        console.info('[confirmProductImage] probando ruta:', candidatePath)
        const response = await apiClient.post<ConfirmProductImageResponse>(
          candidatePath,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Empresa-Id': normalizedEmpresaID,
            },
          },
        )

        console.info('[confirmProductImage] ruta exitosa:', candidatePath)

        return response.data
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
          console.warn('[confirmProductImage] 404 en ruta:', candidatePath)
          continue
        }

        throw new Error(
          `[Confirmar imagen] fallo en ruta ${candidatePath}: ${extractAxiosErrorText(error)}`,
        )
      }
    }

    throw new Error(
      `[Confirmar imagen] 404 en rutas probadas: ${candidatePaths.join(', ')}. Ajusta VITE_PRODUCTS_BASE_PATH.`,
    )
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`[Confirmar imagen] ${extractAxiosErrorText(error)}`)
  }
}

/**
 * Orquestador completo.
 * onStepChange notifica al hook en cada transición para actualizar la UI.
 * Garantía: si uploadToS3 falla, confirmProductImage nunca se ejecuta.
 */
export async function createProductWithImage(
  empresaID: string,
  productPayload: CreateProductRequest,
  file: File,
  onStepChange: (step: 'creating' | 'uploading' | 'confirming') => void,
): Promise<CreateProductResult> {
  onStepChange('creating')
  const created = await createProduct(empresaID, productPayload)

  onStepChange('uploading')
  // Si esto lanza, el error se propaga y confirmación nunca se llama.
  await uploadToS3(created.uploadUrl, file)

  onStepChange('confirming')
  const confirmed = await confirmProductImage(empresaID, created.productoID, {
    s3Key: created.s3Key,
    mimeType: file.type,
    sizeBytes: file.size,
  })

  return {
    productoID: confirmed.productoID,
    imagenUrl: confirmed.imagenUrl,
    imagenS3Key: confirmed.imagenS3Key,
  }
}
