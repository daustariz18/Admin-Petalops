import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import ProductosPage from './pages/ProductosPage'
import BarriosPage from './pages/BarriosPage'
import './App.css'

function normalizeTenantSlug(tenantSlug: string): string {
  return tenantSlug.trim().toLowerCase()
}

function buildUserInitials(value: string): string {
  const cleaned = value.trim().toUpperCase()
  if (!cleaned) return 'U'

  const localPart = cleaned.includes('@') ? cleaned.split('@')[0] : cleaned
  const words = localPart
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`
  }

  if (words.length === 1) {
    return words[0].slice(0, 2)
  }

  return localPart.slice(0, 2) || 'U'
}

function App() {
  const { isAuthenticated, user, login, logout } = useAuth()
  const [section, setSection] = useState<'productos' | 'barrios'>('productos')
  const handleLogout = () => {
    setSection('productos')
    logout()
  }

  if (!isAuthenticated || !user) {
    return <LoginPage onAuthenticated={login} />
  }
  const resolvedStoreName =
    user.empresaNombre?.trim() || normalizeTenantSlug(user.tenantSlug) || `empresa-${user.empresaID}`
  const resolvedUserInitials = buildUserInitials(user.email || user.subject || resolvedStoreName)

  return section === 'productos' ? (
    <ProductosPage
      empresaID={user.empresaID}
      tiendaNombre={resolvedStoreName}
      storeLogoUrl={user.logoUrl}
      userInitials={resolvedUserInitials}
      onLogout={handleLogout}
      onNavigateToBarrios={() => setSection('barrios')}
    />
  ) : (
    <BarriosPage
      empresaID={user.empresaID}
      tiendaNombre={resolvedStoreName}
      storeLogoUrl={user.logoUrl}
      onLogout={handleLogout}
      onNavigateToProductos={() => setSection('productos')}
    />
  )
}

export default App
