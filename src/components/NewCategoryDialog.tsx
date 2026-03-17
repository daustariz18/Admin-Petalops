import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react'

interface NewCategoryDialogProps {
  open: boolean
  nombre: string
  error: string
  isSaving: boolean
  onNombreChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export function NewCategoryDialog({
  open,
  nombre,
  error,
  isSaving,
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
      <p id="modal-nueva-cat-title" style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>
        Nueva categoría
      </p>
      <label className="field">
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
        <p className="pcf-error__message" role="alert">
          {error}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" className="pcf-btn pcf-btn--ghost" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </button>
        <button
          type="button"
          className="pcf-btn pcf-btn--primary"
          onClick={onSubmit}
          disabled={isSaving || !nombre.trim()}
        >
          {isSaving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </dialog>
  )
}
