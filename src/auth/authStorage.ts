const AUTH_TOKEN_KEY = 'petalops.auth.token'
const AUTH_PROFILE_KEY = 'petalops.auth.profile'

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
