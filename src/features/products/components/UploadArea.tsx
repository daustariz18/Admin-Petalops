import { useState, type ChangeEvent, type DragEvent } from 'react'

type UploadAreaProps = {
  disabled: boolean
  slotsLeft: number
  maxPhotos: number
  onUpload: (files: File[]) => void
}

export function UploadArea({ disabled, slotsLeft, maxPhotos, onUpload }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    onUpload(Array.from(event.dataTransfer.files))
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpload(event.target.files ? Array.from(event.target.files) : [])
    event.target.value = ''
  }

  return (
    <label
      className={`pc-upload-area ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={disabled || slotsLeft <= 0}
        onChange={onChange}
        aria-label="Subir fotos de productos"
      />
      <p>Arrastra tus fotos o haz clic para subir</p>
      <small>
        {slotsLeft > 0
          ? `Límite ${maxPhotos} fotos · disponibles ${slotsLeft}`
          : `Límite de ${maxPhotos} fotos alcanzado`}
      </small>
    </label>
  )
}

