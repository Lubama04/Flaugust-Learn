import { lazy, Suspense, useRef, useState } from 'react'
import type { EmojiClickData } from 'emoji-picker-react'
import { Mic, Send, Smile, Square } from 'lucide-react'

// Import dynamique : emoji-picker-react embarque son propre jeu de données d'emojis et
// n'a pas besoin d'alourdir le bundle initial ni le pré-cache du service worker PWA.
const EmojiPicker = lazy(() => import('emoji-picker-react'))
import { Button } from '@/components/ui/button'
import { MediaUpload } from '@/components/chat/MediaUpload'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

export interface MessageInputSubmit {
  text: string
  file: File | null
  audioBlob: Blob | null
}

interface MessageInputProps {
  onSend: (submission: MessageInputSubmit) => Promise<void>
  isSending: boolean
}

/** Zone de saisie du chat : texte, emoji, pièce jointe (image/PDF) et message vocal. */
export function MessageInput({ onSend, isSending }: MessageInputProps) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isRecording, audioBlob, start, stop, reset } = useAudioRecorder()

  const canSend = (!!text.trim() || !!file || !!audioBlob) && !isSending && !isRecording

  const handleSubmit = async () => {
    if (!canSend) return
    const submission: MessageInputSubmit = { text: text.trim(), file, audioBlob }
    setText('')
    setFile(null)
    reset()
    await onSend(submission)
  }

  const handleEmojiClick = (data: EmojiClickData) => {
    setText((t) => t + data.emoji)
    setShowEmoji(false)
  }

  return (
    <div className="relative border-t border-gray-100 bg-white p-3">
      {showEmoji && (
        <div className="absolute bottom-full left-3 mb-2 z-10">
          <Suspense fallback={<div className="flex h-[360px] w-[300px] items-center justify-center rounded-lg border border-gray-100 bg-white text-xs text-gray-400">Chargement…</div>}>
            <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={360} />
          </Suspense>
        </div>
      )}

      {audioBlob && !isRecording && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-lightGray px-3 py-1.5 text-xs text-dark">
          <Mic className="h-3.5 w-3.5" /> Message vocal prêt à l'envoi
          <button type="button" onClick={reset} className="ml-auto text-gray-400 hover:text-dark">
            Annuler
          </button>
        </div>
      )}

      <div ref={containerRef} className="flex items-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowEmoji((s) => !s)}
          aria-label="Emoji"
          disabled={isSending}
        >
          <Smile className="h-4 w-4" />
        </Button>

        <MediaUpload selectedFile={file} onSelect={setFile} onClear={() => setFile(null)} disabled={isSending} />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          placeholder="Écrivez votre message…"
          rows={1}
          disabled={isSending || isRecording}
          className="max-h-24 min-h-[40px] flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <Button
          type="button"
          variant={isRecording ? 'destructive' : 'ghost'}
          size="icon"
          onClick={() => (isRecording ? stop() : start())}
          aria-label={isRecording ? "Arrêter l'enregistrement" : 'Enregistrer un message vocal'}
          disabled={isSending}
        >
          {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button type="button" size="icon" onClick={() => void handleSubmit()} disabled={!canSend} aria-label="Envoyer">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
