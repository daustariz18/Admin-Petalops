import { ProductCreationBoard } from './components/ProductCreationBoard'
import type { ProductItem } from './useProducts'

type ProductFormProps = {
  empresaID: string
  onBack: () => void
  onCreatedMany: (products: Array<Omit<ProductItem, 'id'>>) => void
}

export function ProductForm({ empresaID, onBack, onCreatedMany }: ProductFormProps) {
  return (
    <section className="pf-shell" aria-label="Crear productos">
      <div className="pf-header">
        <h2>Nuevo producto</h2>
        <button type="button" className="pcf-btn pcf-btn--ghost" onClick={onBack}>
          Volver
        </button>
      </div>

      <ProductCreationBoard empresaID={empresaID} onCreatedBatch={onCreatedMany} />
    </section>
  )
}
