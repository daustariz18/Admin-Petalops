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
  onBack: () => void
  onCreatedMany: (products: CreatedProduct[]) => void
}

export function ProductForm({
  empresaID,
  categorias,
  categoriasLoading,
  categoriasError,
  creatingCategoria,
  createCategoria,
  onBack,
  onCreatedMany,
}: ProductFormProps) {
  return (
    <section className="pf-shell" aria-label="Crear productos">
      <div className="pf-header">
        <h2>Nuevo producto</h2>
        <button type="button" className="pcf-btn pcf-btn--ghost" onClick={onBack}>
          Volver
        </button>
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
