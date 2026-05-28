import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { jwtDecode } from 'jwt-decode'
import {
  clearStoredToken,
  getStoredAuthProfile,
  getStoredToken,
  setStoredAuthProfile,
  setStoredToken,
} from './authStorage'
import type { AuthContextValue, AuthLoginPayload, AuthUser, JwtClaims } from './types'
import { setUnauthorizedHandler } from '../services/apiClient'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toStringValue(value: string | number | undefined): string {
  if (value === undefined) return ''
  return String(value)
}

function toStringOptional(value: string | number | undefined): string | undefined {
  const result = toStringValue(value).trim()
  return result || undefined
}

function buildUserFromAuth(token: string, profile?: Partial<AuthLoginPayload>): AuthUser {
  const claims = jwtDecode<JwtClaims>(token)
  const tenantSlug = claims.tenantSlug ?? claims.tenant_slug ?? claims.slug
  const empresaNombre =
    profile?.empresaNombre?.trim() ||
    claims.empresaNombre?.trim() ||
    claims.empresa_nombre?.trim() ||
    claims.companyName?.trim() ||
    claims.company_name?.trim() ||
    undefined

  if (!tenantSlug) {
    throw new Error('Token invalido: tenantSlug no encontrado.')
  }

  const empresaID =
    toStringOptional(profile?.empresaID) ||
    toStringValue(claims.empresaID) ||
    toStringValue(claims.empresaId) ||
    toStringValue(claims.companyId) ||
    toStringValue(claims.tenantId)

  if (!empresaID) {
    throw new Error('Token invalido: empresaID no encontrado.')
  }

  return {
    token,
    tenantSlug,
    empresaID,
    empresaNombre,
    logoUrl:
      profile?.logoUrl?.trim() ||
      claims.logoUrl ||
      claims.logo_url ||
      claims.tenantLogoUrl ||
      claims.tenant_logo_url,
    email: claims.email,
    subject: claims.sub,
    exp: claims.exp,
  }
}

function navigateToTenantDashboard(_tenantSlug: string): void {
  const nextPath = '/products'
  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, '', nextPath)
  }
}

function navigateToLogin(): void {
  if (window.location.pathname !== '/login') {
    window.history.pushState({}, '', '/login')
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const logout = useCallback(() => {
    clearStoredToken()
    setUser(null)
    navigateToLogin()
  }, [])

  const login = useCallback((payload: AuthLoginPayload) => {
    const nextUser = buildUserFromAuth(payload.token, payload)
    setStoredToken(payload.token)
    setStoredAuthProfile(JSON.stringify(nextUser))
    setUser(nextUser)
    navigateToTenantDashboard(nextUser.tenantSlug)
  }, [])

  useEffect(() => {
    const token = getStoredToken()
    const storedProfile = getStoredAuthProfile()

    if (!token) {
      navigateToLogin()
      return
    }

    try {
      const parsedProfile = storedProfile ? (JSON.parse(storedProfile) as Partial<AuthLoginPayload>) : undefined
      const persistedUser = buildUserFromAuth(token, parsedProfile)
      setUser(persistedUser)

      if (window.location.pathname === '/login') {
        navigateToTenantDashboard(persistedUser.tenantSlug)
      }
    } catch {
      clearStoredToken()
      navigateToLogin()
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
    })

    return () => {
      setUnauthorizedHandler(() => undefined)
    }
  }, [logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token: user?.token ?? null,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
