export interface JwtClaims {
  sub?: string
  email?: string
  tenantSlug?: string
  tenant_slug?: string
  slug?: string
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
  logoUrl?: string
  email?: string
  subject?: string
  exp?: number
}

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}
