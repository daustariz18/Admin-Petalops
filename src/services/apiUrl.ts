const API_URL_ENV = import.meta.env.VITE_API_URL as string | undefined

function normalizeBaseUrl(rawBaseUrl: string): string {
  return rawBaseUrl.trim().replace(/\/+$/, '')
}

function normalizePath(rawPath: string): string {
  const trimmed = rawPath.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function collapseDuplicateApiPrefix(baseUrl: string, path: string): string {
  if (!baseUrl.endsWith('/api')) {
    return path
  }

  if (path === '/api') {
    return ''
  }

  if (path.startsWith('/api/')) {
    return path.slice(4)
  }

  return path
}

export function getApiBaseUrl(): string {
  return typeof API_URL_ENV === 'string' ? normalizeBaseUrl(API_URL_ENV) : ''
}

export function hasApiBaseUrl(): boolean {
  return getApiBaseUrl().length > 0
}

export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new Error('La variable VITE_API_URL no esta configurada.')
  }

  const normalizedPath = normalizePath(path)
  if (!normalizedPath) {
    return baseUrl
  }

  const finalPath = collapseDuplicateApiPrefix(baseUrl, normalizedPath)
  if (!finalPath) {
    return baseUrl
  }

  return `${baseUrl}${finalPath}`
}
