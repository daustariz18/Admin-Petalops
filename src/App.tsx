import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import ProductosPage from './pages/ProductosPage'
import './App.css'

function normalizeTenantSlug(tenantSlug: string): string {
  return tenantSlug.trim().toLowerCase()
}

function resolveTenantSlug(tenantSlug: string, empresaID: string): string {
  const normalizedEmpresaID = empresaID.trim()
  const slugByEmpresaID: Record<string, string> = {
    '3': 'flora',
  }

  return slugByEmpresaID[normalizedEmpresaID] || normalizeTenantSlug(tenantSlug)
}

function resolveStoreLogoUrl(tenantSlug: string): string {
  const slug = normalizeTenantSlug(tenantSlug)

  const known: Record<string, string> = {
    petalops: 'https://ddy2osi8uorg4.cloudfront.net/tenants/petalops/logos/PetalOps+Logo.png',
    flora: 'https://ddy2osi8uorg4.cloudfront.net/tenants/flora/logos/Flora+Logo.png',
  }

  if (known[slug]) return known[slug]
  return `https://ddy2osi8uorg4.cloudfront.net/tenants/${encodeURIComponent(slug)}/logos/${encodeURIComponent(slug)}+Logo.png`
}

function App() {
  const { isAuthenticated, user, login, logout } = useAuth()

  if (!isAuthenticated || !user) {
    return <LoginPage onAuthenticated={login} />
  }
  const resolvedTenantSlug = resolveTenantSlug(user.tenantSlug, user.empresaID)
  const resolvedStoreLogoUrl = resolveStoreLogoUrl(resolvedTenantSlug)

  return (
    <ProductosPage
      empresaID={user.empresaID}
      tiendaNombre={resolvedTenantSlug}
      storeLogoUrl={resolvedStoreLogoUrl}
      onLogout={logout}
    />
  )
}

export default App
