import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { NewCategoryDialog } from './NewCategoryDialog'
import { useCategorias } from '../hooks/useCategorias'
import { useCreateProductWithImage } from '../hooks/useCreateProductWithImage'
import { ACCEPTED_MIME_TYPES } from '../services/productService'
import type { CreateProductStep } from '../types/product'

// ── Tipos internos ────────────────────────────────────────────────────────────

interface FormFields {
  nombre: string
  precio: string
  categoriaID: string
}

interface ProductCreateFormProps {
  /** ID de empresa enviado en el header X-Empresa-Id; viene de sesión/env, no del usuario. */
  empresaID: string
}

const INITIAL_FIELDS: FormFields = { nombre: '', precio: '', categoriaID: '' }

// ── Indicador de pasos (barra visual por etapa) ───────────────────────────────

type StepInOrder = 'creating' | 'uploading' | 'confirming' | 'success'

const STEP_ORDER: ReadonlyArray<StepInOrder> = ['creating', 'uploading', 'confirming', 'success']

const STEP_DISPLAY_NAMES: Record<StepInOrder, string> = {
  creating: 'Registrar',
  uploading: 'Subir',
  confirming: 'Confirmar',
  success: 'Listo',
}

function StepIndicator({ step }: { step: CreateProductStep }) {
  if (step === 'idle') return null

  // Tras el early return de 'idle', step ya no puede ser 'idle'; solo excluimos 'error'.
  const currentIdx =
    step !== 'error'
      ? (STEP_ORDER as ReadonlyArray<string>).indexOf(step)
      : -1

  return (
    <div className="pcf-steps" role="status" aria-label="Progreso del proceso">
      {STEP_ORDER.map((s, idx) => {
        const isDone = step === 'success' || (currentIdx > idx && currentIdx !== -1)
        const isActive = currentIdx === idx && step !== 'success' && step !== 'error'

        return (
          <div
            key={s}
            className={[
              'pcf-step',
              isActive ? 'active' : '',
              isDone ? 'done' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="pcf-step__dot" aria-hidden="true" />
            <span className="pcf-step__label">{STEP_DISPLAY_NAMES[s]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ProductCreateForm({ empresaID }: ProductCreateFormProps) {
  const {
    step,
    progress,
    stepLabel,
    errorMessage,
    result,
    canRetryConfirm,
    submit,
    retryConfirm,
    reset,
  } = useCreateProductWithImage()

  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [formError, setFormError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    categorias,
    categoriasLoading,
    categoriasError,
    creatingCategoria,
    createCategoria,
  } = useCategorias()

  // ── Modal: nueva categoría ────────────────────────────────────────────────
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('')
  const [modalError, setModalError] = useState('')

  const isBusy = step === 'creating' || step === 'uploading' || step === 'confirming'
  const isInProgress = isBusy || step === 'success'

  // Gestión de URLs de objeto para preview: se revoca automáticamente al cambiar.
  useEffect(() => {
    if (!selectedFile) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  const closeModal = () => {
    setIsAddingCategory(false)
    setNuevaCategoriaNombre('')
    setModalError('')
  }

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFields((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (isBusy) return

    if (!selectedFile) {
      setFormError('Debes seleccionar una imagen antes de continuar.')
      return
    }

    const precio = parseFloat(fields.precio)
    const categoriaID = parseInt(fields.categoriaID, 10)

    if (isNaN(precio) || precio <= 0) {
      setFormError('El precio debe ser un número mayor a 0.')
      return
    }
    if (isNaN(categoriaID) || categoriaID <= 0) {
      setFormError('Debes seleccionar una categoría.')
      return
    }

    await submit(
      empresaID,
      {
        nombre: fields.nombre.trim(),
        precio,
        categoriaID,
        mimeType: selectedFile.type,
      },
      selectedFile,
    )
  }

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'new') {
      setIsAddingCategory(true)
      return
    }
    setFields((prev) => ({ ...prev, categoriaID: value }))
  }

  const handleNuevaCategoria = async () => {
    const nombre = nuevaCategoriaNombre.trim()
    if (!nombre) {
      setModalError('El nombre no puede estar vacío.')
      return
    }
    setModalError('')
    try {
      const nueva = await createCategoria(nombre)
      setFields((prev) => ({ ...prev, categoriaID: String(nueva.idCategoria) }))
      closeModal()
    } catch {
      setModalError('No se pudo crear la categoría. Intenta de nuevo.')
    }
  }

  const handleReset = () => {
    setFields(INITIAL_FIELDS)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFormError('')
    reset()
  }

  // ── Estado de éxito ──────────────────────────────────────────────────────
  if (step === 'success' && result) {
    return (
      <div className="pcf-success" role="status" aria-live="polite">
        <p className="pcf-success__title">Producto creado</p>
        <dl className="pcf-success__details">
          <dt>Producto ID</dt>
          <dd>{result.productoID}</dd>
          <dt>S3 Key</dt>
          <dd>
            <code>{result.imagenS3Key}</code>
          </dd>
          <dt>URL de imagen</dt>
          <dd>
            <a href={result.imagenUrl} target="_blank" rel="noreferrer" className="pcf-link">
              {result.imagenUrl}
            </a>
          </dd>
        </dl>
        <button type="button" className="pcf-btn pcf-btn--primary" onClick={handleReset}>
          Crear otro producto
        </button>
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <>
    <form className="pcf-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
      <div className="pcf-fields">
        {/* Fila 1 – nombre (ancho completo) */}
        <label className="field pcf-field--full">
          <span>Nombre del producto</span>
          <input
            type="text"
            name="nombre"
            value={fields.nombre}
            onChange={handleFieldChange}
            placeholder="Ramo de rosas"
            required
            disabled={isInProgress}
            autoComplete="off"
          />
        </label>

        {/* Fila 2 – precio y categoría (2 columnas) */}
        <label className="field">
          <span>Precio</span>
          <input
            type="number"
            name="precio"
            value={fields.precio}
            onChange={handleFieldChange}
            placeholder="45000"
            min="1"
            step="1"
            required
            disabled={isInProgress}
          />
        </label>

        <label className="field">
          <span>Categoría</span>
          <select
            name="categoriaID"
            value={fields.categoriaID}
            onChange={handleCategoryChange}
            required
            disabled={isInProgress || categoriasLoading}
          >
            <option value="" disabled>
              {categoriasLoading ? 'Cargando…' : 'Selecciona una categoría'}
            </option>
            {(Array.isArray(categorias) ? categorias : []).map((cat) => (
              <option key={cat.idCategoria} value={String(cat.idCategoria)}>
                {cat.nombre}
              </option>
            ))}
            <option value="new">+ Agregar nueva...</option>
          </select>

          {categoriasError ? (
            <p className="pcf-error__message" role="alert">
              {categoriasError}
            </p>
          ) : null}

          {!categoriasLoading && Array.isArray(categorias) && categorias.length > 0 ? (
            <div className="category-list-preview" aria-live="polite">
              <p className="category-list-preview__title">Categorías disponibles</p>
              <ul>
                {categorias.map((cat) => (
                  <li key={`preview-${cat.idCategoria}`}>
                    <span>#{cat.idCategoria}</span>
                    <strong>{cat.nombre}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </label>

        {/* Fila 3 – imagen (ancho completo) */}
        <div className="field pcf-field--full">
          <span>Imagen del producto</span>
          <label
            className={['file-input-wrapper', isInProgress ? 'disabled' : '']
              .filter(Boolean)
              .join(' ')}
            htmlFor="pcf-file-input"
          >
            <span>{selectedFile ? selectedFile.name : 'Elegir imagen'}</span>
            <input
              ref={fileInputRef}
              id="pcf-file-input"
              type="file"
              accept={ACCEPTED_MIME_TYPES.join(',')}
              onChange={handleFileChange}
              disabled={isInProgress}
              required
            />
          </label>
          <span className="hint" style={{ marginTop: '0.35rem' }}>
            JPEG, PNG o WebP · máx. 5 MB
          </span>
        </div>
      </div>

      {/* Preview de imagen seleccionada */}
      {filePreview ? (
        <div className="preview-wrapper">
          <img src={filePreview} alt="Vista previa de la imagen seleccionada" className="preview-image" />
        </div>
      ) : null}

      {/* Indicador de pasos */}
      <StepIndicator step={step} />

      {/* Barra de progreso */}
      {isBusy ? (
        <>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso"
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="hint" aria-live="polite">
            {stepLabel}
          </p>
        </>
      ) : null}

      {/* Mensajes de error */}
      {step === 'error' ? (
        <div className="pcf-error" role="alert">
          <p className="pcf-error__message">{errorMessage}</p>
          {/* El botón de reintento solo aparece si S3 subió ok pero confirm falló. */}
          {canRetryConfirm ? (
            <button
              type="button"
              className="pcf-btn pcf-btn--retry"
              onClick={() => void retryConfirm()}
            >
              Reintentar confirmación
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Acciones */}
      <div className="pcf-actions">
        <button
          type="submit"
          className="pcf-btn pcf-btn--primary"
          disabled={isBusy || !fields.nombre.trim()}
        >
          {isBusy ? 'Procesando…' : 'Crear producto'}
        </button>

        {formError ? (
          <div className="pcf-error" role="alert">
            <p className="pcf-error__message">{formError}</p>
          </div>
        ) : null}

        {step === 'error' ? (
          <button type="button" className="pcf-btn pcf-btn--ghost" onClick={handleReset}>
            Limpiar formulario
          </button>
        ) : null}
      </div>
    </form>

    {isAddingCategory && (
      <div className="modal-container">
        <NewCategoryDialog
          open={isAddingCategory}
          nombre={nuevaCategoriaNombre}
          error={modalError}
          isSaving={creatingCategoria}
          onNombreChange={setNuevaCategoriaNombre}
          onCancel={closeModal}
          onSubmit={() => void handleNuevaCategoria()}
        />
      </div>
    )}
    </>
  )
}
