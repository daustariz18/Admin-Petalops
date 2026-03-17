export interface GetSignedUrlRequest {
  empresaID: string
  productoID: string
  fileType: string
  fileName?: string
  sizeBytes: number
}

export interface GetSignedUrlResponse {
  uploadUrl: string
  key: string
  expiresIn: number
}

export interface ConfirmUploadRequest {
  empresaID: string
  s3Key: string
  mimeType: string
  sizeBytes: number
  esPrincipal: boolean
}

export interface UploadedImage {
  s3Key: string
  mimeType: string
  sizeBytes: number
  esPrincipal: boolean
  url?: string
}

type AvailableProductResponse = {
  productoID?: string
  productId?: string
  id?: string
}

const RAW_API = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
const API = import.meta.env.DEV ? '' : RAW_API
const useUploadMock = import.meta.env.VITE_USE_UPLOAD_MOCK === 'true'
const availableProductEndpoint =
  import.meta.env.VITE_AVAILABLE_PRODUCT_ENDPOINT || '/api/productos/disponible'
const reserveProductEndpoint =
  import.meta.env.VITE_RESERVE_PRODUCT_ENDPOINT || '/api/productos/reservar-disponible'

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const base = API.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${base}${normalizedPath}`
}

function assertJsonContentType(contentType: string | null | undefined): void {
  if (!contentType?.includes('application/json')) {
    throw new Error('API returned HTML instead of JSON')
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function inferExtensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/png') {
    return 'png'
  }

  if (mimeType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
}

export async function getAvailableProductoID(empresaID: string): Promise<string> {
  if (!empresaID) {
    throw new Error('Empresa ID es obligatorio para obtener un Producto ID disponible.')
  }

  if (useUploadMock) {
    await sleep(250)
    return `producto-demo-${Math.floor(Date.now() / 1000)}`
  }

  const response = await fetch(
    `${buildApiUrl(availableProductEndpoint)}?empresaID=${encodeURIComponent(empresaID)}`,
  )

  if (!response.ok) {
    const errorMessage = await response.text()
    throw new Error(errorMessage || 'No se pudo obtener un Producto ID disponible.')
  }

  assertJsonContentType(response.headers.get('content-type'))
  const payload = (await response.json()) as AvailableProductResponse
  const productoID = payload.productoID || payload.productId || payload.id

  if (!productoID) {
    throw new Error('La API no devolvio un Producto ID valido.')
  }

  return productoID
}

export async function reserveAvailableProductoID(empresaID: string): Promise<string> {
  if (!empresaID) {
    throw new Error('Empresa ID es obligatorio para reservar un Producto ID.')
  }

  if (useUploadMock) {
    await sleep(250)
    return `producto-reservado-${Math.floor(Date.now() / 1000)}`
  }

  const reserveResponse = await fetch(buildApiUrl(reserveProductEndpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ empresaID }),
  })

  if (reserveResponse.ok) {
    assertJsonContentType(reserveResponse.headers.get('content-type'))
    const payload = (await reserveResponse.json()) as AvailableProductResponse
    const productoID = payload.productoID || payload.productId || payload.id

    if (!productoID) {
      throw new Error('La API no devolvio un Producto ID valido en la reserva.')
    }

    return productoID
  }

  if (reserveResponse.status !== 404 && reserveResponse.status !== 405) {
    const errorMessage = await reserveResponse.text()
    throw new Error(errorMessage || 'No se pudo reservar un Producto ID disponible.')
  }

  return getAvailableProductoID(empresaID)
}

export async function getSignedUrl(
  payload: GetSignedUrlRequest,
): Promise<GetSignedUrlResponse> {
  if (useUploadMock) {
    await sleep(450)

    const extension = inferExtensionFromMimeType(payload.fileType)
    const key = `productos/${payload.empresaID}/${payload.productoID}/${crypto.randomUUID()}.${extension}`

    return {
      uploadUrl: `https://mock-s3.local/upload/${encodeURIComponent(key)}`,
      key,
      expiresIn: 60,
    }
  }

  const response = await fetch(buildApiUrl('/api/uploads/signed-url'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorMessage = await response.text()
    throw new Error(errorMessage || 'No se pudo obtener la signed URL.')
  }

  assertJsonContentType(response.headers.get('content-type'))
  return (await response.json()) as GetSignedUrlResponse
}

export async function uploadToS3(
  signedUrl: string,
  file: File,
): Promise<void> {
  if (useUploadMock) {
    const _signedUrl = signedUrl
    const _file = file
    if (!_signedUrl || !_file) {
      throw new Error('Datos de carga inválidos en modo mock.')
    }
    await sleep(700)
    return
  }

  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error('No se pudo subir la imagen a S3.')
  }
}

export async function confirmUpload(
  productoID: string,
  payload: ConfirmUploadRequest,
): Promise<UploadedImage> {
  if (useUploadMock) {
    await sleep(350)

    return {
      s3Key: payload.s3Key,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      esPrincipal: payload.esPrincipal,
      url: `https://cdn.mock-petalops.local/${payload.s3Key}`,
    }
  }

  const response = await fetch(buildApiUrl(`/api/productos/${productoID}/imagenes`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorMessage = await response.text()
    throw new Error(errorMessage || 'No se pudo confirmar la imagen en la API.')
  }

  assertJsonContentType(response.headers.get('content-type'))
  return (await response.json()) as UploadedImage
}
