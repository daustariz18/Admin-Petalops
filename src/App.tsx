import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import ProductosPage from './pages/ProductosPage'
import './App.css'

function normalizeTenantSlug(tenantSlug: string): string {
  return tenantSlug.trim().toLowerCase()
}

function App() {
  const { isAuthenticated, user, login, logout } = useAuth()

  if (!isAuthenticated || !user) {
    return <LoginPage onAuthenticated={login} />
  }
  const resolvedTenantSlug = normalizeTenantSlug(user.tenantSlug) || `empresa-${user.empresaID}`

  return (
    <ProductosPage
      empresaID={user.empresaID}
      tiendaNombre={resolvedTenantSlug}
      storeLogoUrl={user.logoUrl}
      onLogout={logout}
    />
  )
}

export default App
