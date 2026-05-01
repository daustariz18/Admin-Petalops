import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react'

interface NewCategoryDialogProps {
  open: boolean
  nombre: string
  error: string
  isSaving: boolean
  title?: string
  submitLabel?: string
  onNombreChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export function NewCategoryDialog({
  open,
  nombre,
  error,
  isSaving,
  title = 'Nueva categoría',
  submitLabel = 'Guardar',
  onNombreChange,
  onCancel,
  onSubmit,
}: Readonly<NewCategoryDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSubmit()
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onNombreChange(event.target.value)
  }

  return (
    <dialog
      ref={dialogRef}
      className="pcf-dialog"
      aria-labelledby="modal-nueva-cat-title"
      onClose={onCancel}
    >
      <div className="pcf-dialog__panel">
        <header className="pcf-dialog__header">
          <p className="pcf-dialog__eyebrow">Categorías</p>
          <div className="pcf-dialog__title-group">
            <h2 id="modal-nueva-cat-title">{title}</h2>
            <p className="pcf-dialog__subtitle">
              Cambia el nombre de forma clara para mantener tu catálogo ordenado.
            </p>
          </div>
        </header>

        <label className="pcf-dialog__field field">
          <span>Nombre</span>
          <input
            type="text"
            value={nombre}
            onChange={handleInputChange}
            placeholder="Ej.: Bodas"
            disabled={isSaving}
            onKeyDown={handleInputKeyDown}
          />
        </label>

        {error ? (
          <p className="pcf-error__message pcf-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pcf-dialog__actions">
          <button type="button" className="pcf-btn pcf-btn--ghost" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </button>
          <button
            type="button"
            className="pcf-btn pcf-btn--primary"
            onClick={onSubmit}
            disabled={isSaving || !nombre.trim()}
          >
            {isSaving ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
