export interface JwtClaims {
  sub?: string
  email?: string
  tenantSlug?: string
  tenant_slug?: string
  slug?: string
  empresaNombre?: string
  empresa_nombre?: string
  companyName?: string
  company_name?: string
  logoUrl?: string
  logo_url?: string
  tenantLogoUrl?: string
  tenant_logo_url?: string
  empresaID?: string | number
  empresaId?: string | number
  companyId?: string | number
  tenantId?: string | number
  exp?: number
  iat?: number
}

export interface AuthUser {
  token: string
  tenantSlug: string
  empresaID: string
  empresaNombre?: string
  logoUrl?: string
  email?: string
  subject?: string
  exp?: number
}

export interface AuthLoginPayload {
  token: string
  empresaID?: string | number
  empresaSlug?: string
  empresaNombre?: string
  logoUrl?: string
}

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (payload: AuthLoginPayload) => void
  logout: () => void
}
