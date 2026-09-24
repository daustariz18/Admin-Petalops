import { useState, type ChangeEvent, type DragEvent } from 'react'

type UploadAreaProps = {
  disabled: boolean
  slotsLeft: number
  maxPhotos: number
  onUpload: (files: File[]) => void
  onCreateCategory: () => void
}

export function UploadArea({ disabled, slotsLeft, maxPhotos, onUpload, onCreateCategory }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const uploadedCount = maxPhotos - slotsLeft
  const percent = Math.round((uploadedCount / maxPhotos) * 100)

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    onUpload(Array.from(event.dataTransfer.files))
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpload(event.target.files ? Array.from(event.target.files) : [])
    event.target.value = ''
  }

  return (
    <div
      className={`pc-dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <label className="pc-dropzone__box">
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || slotsLeft <= 0}
          onChange={onChange}
          aria-label="Subir fotos de productos"
          className="pc-dropzone__input"
        />

        <div className="pc-dropzone__icon">
          <span />
          <span />
        </div>

        <div className="pc-dropzone__copy">
          <p>Arrastra tus imagenes aqui</p>
          <small>o haz clic para seleccionar</small>
        </div>

        <div className="pc-dropzone__actions">
          <span className="pc-dropzone__counter">
            {uploadedCount} / {maxPhotos} imagenes
            <i style={{ width: `${percent}%` }} />
          </span>
          <span className="pc-dropzone__button">Seleccionar archivos</span>
        </div>
      </label>

      <span className="pc-upload-divider" aria-hidden="true" />

      <button
        type="button"
        className="pc-btn pc-btn--ghost pc-btn--full"
        onClick={(event) => {
          event.preventDefault()
          onCreateCategory()
        }}
        disabled={disabled}
      >
        Nueva categoria
      </button>

    </div>
  )
}
