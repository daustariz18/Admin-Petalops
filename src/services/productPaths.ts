const DEFAULT_PRODUCTS_BASE_PATH = '/admin/productos'

function normalizePathSegment(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

function normalizeBasePath(value: string | undefined): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return DEFAULT_PRODUCTS_BASE_PATH
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash.replace(/\/+$/, '')
}

export function getProductsBasePath(): string {
  return normalizeBasePath(import.meta.env.VITE_PRODUCTS_BASE_PATH as string | undefined)
}

export function buildProductsEndpoint(...segments: string[]): string {
  const basePath = getProductsBasePath()
  const cleanSegments = segments.map(normalizePathSegment).filter(Boolean)
  return cleanSegments.length > 0 ? `${basePath}/${cleanSegments.join('/')}` : basePath
}
