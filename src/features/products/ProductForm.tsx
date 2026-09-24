import { ProductCreationBoard } from './components/ProductCreationBoard'
import type { Categoria } from '../../hooks/useCategorias'
import type { ProductItem } from './useProducts'

type CreatedProduct = Omit<ProductItem, 'id'> & {
  backend_id?: number
  codigo_producto?: string
}

type ProductFormProps = {
  empresaID: string
  categorias: Categoria[]
  categoriasLoading: boolean
  categoriasError: string
  creatingCategoria: boolean
  createCategoria: (nombre: string) => Promise<Categoria>
  tiendaNombre?: string
  storeLogoUrl?: string
  onBack: () => void
  onCreatedMany: (products: CreatedProduct[]) => void
}

function getStoreInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'P'
}

export function ProductForm({
  empresaID,
  categorias,
  categoriasLoading,
  categoriasError,
  creatingCategoria,
  createCategoria,
  tiendaNombre = 'Empresa',
  storeLogoUrl,
  onBack,
  onCreatedMany,
}: ProductFormProps) {
  return (
    <section className="pf-shell" aria-label="Crear productos">
      <div className="pf-header">
        <div className="pf-brand-left">
          {storeLogoUrl ? (
            <img src={storeLogoUrl} alt={`Logo ${tiendaNombre}`} className="pf-store-logo" />
          ) : (
            <span className="pf-store-fallback" aria-hidden="true">
              {getStoreInitial(tiendaNombre)}
            </span>
          )}
          <strong>{tiendaNombre}</strong>
        </div>
        <div className="pf-header-actions">
          <button type="button" className="pcf-btn pcf-btn--ghost" onClick={onBack}>
            <span aria-hidden="true">&lt;-</span>
            Volver
          </button>
        </div>
      </div>

      <ProductCreationBoard
        empresaID={empresaID}
        categorias={categorias}
        categoriasLoading={categoriasLoading}
        categoriasError={categoriasError}
        creatingCategoria={creatingCategoria}
        createCategoria={createCategoria}
        onCreatedBatch={onCreatedMany}
      />
    </section>
  )
}
