import { useRef } from 'react'
import { Paperclip, X, FileImage, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 Mo, cohérent avec la limite d'upload chat côté UX.
const ACCEPTED = 'image/png,image/jpeg,image/webp,image/gif,application/pdf'

interface MediaUploadProps {
  selectedFile: File | null
  onSelect: (file: File) => void
  onClear: () => void
  disabled?: boolean
}

/** Bouton de pièce jointe pour le chat : image ou PDF, avec aperçu du nom de fichier choisi. */
export function MediaUpload({ selectedFile, onSelect, onClear, disabled }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      e.target.value = ''
      return
    }
    onSelect(file)
    e.target.value = ''
  }

  if (selectedFile) {
    const Icon = selectedFile.type.startsWith('image/') ? FileImage : FileText
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-lightGray px-3 py-1 text-xs text-dark">
        <Icon className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate">{selectedFile.name}</span>
        <button type="button" onClick={onClear} aria-label="Retirer la pièce jointe">
          <X className="h-3.5 w-3.5 text-gray-400 hover:text-dark" />
        </button>
      </div>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleChange} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label="Joindre un fichier"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  )
}
