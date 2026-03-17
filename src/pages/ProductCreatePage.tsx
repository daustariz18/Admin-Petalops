/**
 * ProductCreatePage.tsx
 *
 * Página de ejemplo de uso de ProductCreateForm.
 *
 * empresaID viene de la variable de entorno VITE_EMPRESA_ID. En producción
 * real se leerá del contexto de sesión/auth; por eso está desacoplado del
 * formulario y se inyecta como prop, no como estado interno del form.
 */
import { ProductCreateForm } from '../components/ProductCreateForm'

type ProductCreatePageProps = {
  tenantSlug: string
  empresaID: string
  onLogout: () => void
}

export function ProductCreatePage({ tenantSlug, empresaID, onLogout }: ProductCreatePageProps) {
  return (
    <main className="app-shell">
      <section className="card">
        <div className="tenant-topbar">
          <p className="eyebrow">{tenantSlug.toUpperCase()} · PetalOps</p>
          <button type="button" className="pcf-btn pcf-btn--ghost" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
        <h1>Nuevo producto</h1>
        <p className="subtitle">
          Completa los datos y selecciona una imagen. El producto se registra en base de datos,
          la imagen se sube directo a S3 y se confirma en un solo flujo automático.
        </p>

        {/* empresaID va por header X-Empresa-Id en cada llamada a la API */}
        <ProductCreateForm empresaID={empresaID} />
      </section>
    </main>
  )
}
