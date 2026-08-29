const AUTH_TOKEN_KEY = 'petalops.auth.token'
const AUTH_PROFILE_KEY = 'petalops.auth.profile'
const TENANT_SLUG_KEY = 'slug'

type StoredAuthProfile = {
  tenantSlug?: string
  empresa_slug?: string
  empresaSlug?: string
  slug?: string
}

function normalizeSlug(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null
}

function getStoredTenantSlug(): string | null {
  try {
    const rawProfile = localStorage.getItem(AUTH_PROFILE_KEY)
    if (!rawProfile) return null

    const profile = JSON.parse(rawProfile) as StoredAuthProfile
    return normalizeSlug(profile.tenantSlug || profile.empresa_slug || profile.empresaSlug || profile.slug)
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getStoredAuthProfile(): string | null {
  return localStorage.getItem(AUTH_PROFILE_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function setStoredAuthProfile(profile: string): void {
  localStorage.setItem(AUTH_PROFILE_KEY, profile)
}

export function clearStoredToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_PROFILE_KEY)
}

export function syncLoginTenantFromUrl(): void {
  const params = new URLSearchParams(window.location.search)
  const slugFromUrl =
    normalizeSlug(params.get('forceTenant')) ||
    normalizeSlug(params.get('slug')) ||
    normalizeSlug(params.get('tenant')) ||
    normalizeSlug(params.get('empresaSlug'))

  if (!slugFromUrl) return

  const storedTenantSlug = getStoredTenantSlug()

  if (storedTenantSlug && storedTenantSlug !== slugFromUrl) {
    clearStoredToken()
  }

  localStorage.setItem(TENANT_SLUG_KEY, slugFromUrl)
}
