import { LoginForm } from './components/LoginForm'
import { useAuth } from './hooks/useAuth'
import { ProductCreatePage } from './pages/ProductCreatePage'
import './App.css'

function App() {
  const { isAuthenticated, user, logout } = useAuth()

  if (!isAuthenticated || !user) {
    return (
      <main className="app-shell">
        <section className="card auth-card">
          <p className="eyebrow">PetalOps Auth</p>
          <h1>Acceso de tenant</h1>
          <LoginForm />
        </section>
      </main>
    )
  }

  return (
    <ProductCreatePage
      tenantSlug={user.tenantSlug}
      empresaID={user.empresaID}
      onLogout={logout}
    />
  )
}

export default App
