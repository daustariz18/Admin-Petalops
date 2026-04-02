import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { jwtDecode } from 'jwt-decode'
import { clearStoredToken, getStoredToken, setStoredToken } from './authStorage'
import type { AuthContextValue, AuthUser, JwtClaims } from './types'
import { setUnauthorizedHandler } from '../services/apiClient'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toStringValue(value: string | number | undefined): string {
  if (value === undefined) return ''
  return String(value)
}

function buildUserFromToken(token: string): AuthUser {
  const claims = jwtDecode<JwtClaims>(token)
  const tenantSlug = claims.tenantSlug ?? claims.tenant_slug ?? claims.slug

  if (!tenantSlug) {
    throw new Error('Token invalido: tenantSlug no encontrado.')
  }

  const empresaID =
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
    logoUrl: claims.logoUrl ?? claims.logo_url ?? claims.tenantLogoUrl ?? claims.tenant_logo_url,
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

  const login = useCallback((token: string) => {
    const nextUser = buildUserFromToken(token)
    setStoredToken(token)
    setUser(nextUser)
    navigateToTenantDashboard(nextUser.tenantSlug)
  }, [])

  useEffect(() => {
    const token = getStoredToken()

    if (!token) {
      navigateToLogin()
      return
    }

    try {
      const persistedUser = buildUserFromToken(token)
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
