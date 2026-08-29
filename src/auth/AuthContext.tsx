import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { jwtDecode } from 'jwt-decode'
import {
  clearStoredToken,
  getStoredAuthProfile,
  getStoredToken,
  setStoredAuthProfile,
  setStoredToken,
  syncLoginTenantFromUrl,
} from './authStorage'
import type { AuthContextValue, AuthLoginPayload, AuthUser, JwtClaims } from './types'
import { setUnauthorizedHandler } from '../services/apiClient'
import { buildApiUrl, hasApiBaseUrl } from '../services/apiUrl'

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
  const tenantSlug = profile?.empresaSlug ?? claims.tenantSlug ?? claims.tenant_slug ?? claims.slug
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

type AdminProductosExchangeResponse = {
  accessToken?: string
  access_token?: string
  user?: {
    empresaID?: string | number
    empresaSlug?: string
    empresaNombre?: string
    logoUrl?: string
  }
  empresa_id?: string | number
  empresa_slug?: string
  empresa_nombre?: string
  logo_url?: string
}

async function exchangeAdminProductosSession(): Promise<AuthLoginPayload | null> {
  if (!hasApiBaseUrl()) return null

  const response = await fetch(buildApiUrl('/auth/admin-productos/exchange'), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) return null

  const data = (await response.json().catch(() => ({}))) as AdminProductosExchangeResponse
  const token = data.accessToken || data.access_token
  if (!token) return null

  return {
    token,
    empresaID: data.user?.empresaID ?? data.empresa_id,
    empresaSlug: data.user?.empresaSlug ?? data.empresa_slug,
    empresaNombre: data.user?.empresaNombre ?? data.empresa_nombre,
    logoUrl: data.user?.logoUrl ?? data.logo_url,
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initializing, setInitializing] = useState(true)

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
    const bootstrapAuth = async () => {
      syncLoginTenantFromUrl()

      const token = getStoredToken()
      const storedProfile = getStoredAuthProfile()

      if (token) {
        try {
          const parsedProfile = storedProfile ? (JSON.parse(storedProfile) as Partial<AuthLoginPayload>) : undefined
          const persistedUser = buildUserFromAuth(token, parsedProfile)
          setUser(persistedUser)

          if (window.location.pathname === '/login') {
            navigateToTenantDashboard(persistedUser.tenantSlug)
          }
          setInitializing(false)
          return
        } catch {
          clearStoredToken()
        }
      }

      try {
        const exchangedPayload = await exchangeAdminProductosSession()
        if (exchangedPayload) {
          const exchangedUser = buildUserFromAuth(exchangedPayload.token, exchangedPayload)
          setStoredToken(exchangedPayload.token)
          setStoredAuthProfile(JSON.stringify(exchangedUser))
          setUser(exchangedUser)
          navigateToTenantDashboard(exchangedUser.tenantSlug)
          setInitializing(false)
          return
        }
      } catch {
        clearStoredToken()
      }

      setInitializing(false)
      navigateToLogin()
    }

    void bootstrapAuth()
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
      isInitializing: initializing,
      login,
      logout,
    }),
    [user, initializing, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
