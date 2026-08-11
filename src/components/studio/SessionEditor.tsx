import { useState, type ChangeEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { sessionFormSchema, type SessionFormInput } from '@/lib/validations'
import { RichTextEditor } from '@/components/studio/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UploadCloud } from 'lucide-react'
import type { CourseSession } from '@/types'

const SESSION_TYPES: { value: SessionFormInput['type']; label: string }[] = [
  { value: 'texte', label: 'Texte' },
  { value: 'video', label: 'Vidéo' },
  { value: 'audio', label: 'Audio' },
  { value: 'pdf', label: 'PDF' },
  { value: 'slides', label: 'Slides' },
  { value: 'live', label: 'Session live' },
]

const UPLOAD_CONFIG: Record<string, { bucket: string; maxBytes: number; accept: string }> = {
  video: { bucket: 'course-videos', maxBytes: 2 * 1024 * 1024 * 1024, accept: 'video/mp4,video/webm,video/quicktime' },
  audio: { bucket: 'course-documents', maxBytes: 50 * 1024 * 1024, accept: 'audio/mpeg,audio/wav,audio/ogg' },
  pdf: { bucket: 'course-documents', maxBytes: 50 * 1024 * 1024, accept: 'application/pdf' },
}

interface SessionEditorProps {
  moduleId: string
  courseId: string
  session?: CourseSession
  nextOrderIndex: number
  onSaved: () => void
  onCancel: () => void
}

export function SessionEditor({ moduleId, courseId, session, nextOrderIndex, onSaved, onCancel }: SessionEditorProps) {
  const toast = useToast()
  const [contentText, setContentText] = useState(session?.content_text ?? '')
  const [contentUrl, setContentUrl] = useState(session?.content_url ?? '')
  const [uploading, setUploading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormInput>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: session?.title ?? '',
      description: session?.description ?? '',
      type: session?.type ?? 'texte',
      durationMinutes: session?.duration_minutes ?? 0,
      isFreePreview: session?.is_free_preview ?? false,
    },
  })

  const type = watch('type')
  const uploadConfig = UPLOAD_CONFIG[type]

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadConfig) return

    if (file.size > uploadConfig.maxBytes) {
      toast.error('Fichier trop volumineux')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${courseId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(uploadConfig.bucket).upload(path, file, {
        contentType: file.type,
      })
      if (error) throw error
      setContentUrl(path)
      toast.success('Fichier envoyé')
    } catch {
      toast.error("Erreur lors de l'envoi du fichier")
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (values: SessionFormInput) => {
    const payload = {
      title: values.title,
      description: values.description ?? '',
      type: values.type,
      duration_minutes: values.durationMinutes,
      is_free_preview: values.isFreePreview,
      content_text: values.type === 'texte' ? contentText : null,
      content_url: values.type !== 'texte' ? contentUrl || null : null,
    }

    try {
      if (session) {
        const { error } = await supabase.from('sessions').update(payload).eq('id', session.id)
        if (error) throw error
        toast.success('Session mise à jour')
      } else {
        const { error } = await supabase
          .from('sessions')
          .insert({ ...payload, module_id: moduleId, order_index: nextOrderIndex })
        if (error) throw error
        toast.success('Session créée')
      }
      onSaved()
    } catch {
      toast.error("Erreur lors de l'enregistrement de la session")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre de la session</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optionnelle)</Label>
        <Textarea id="description" rows={2} {...register('description')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="type">Type de contenu</Label>
          <select
            id="type"
            {...register('type')}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Durée (minutes)</Label>
          <Input id="durationMinutes" type="number" min="0" {...register('durationMinutes', { valueAsNumber: true })} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Controller
            control={control}
            name="isFreePreview"
            render={({ field }) => (
              <input
                id="isFreePreview"
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4"
              />
            )}
          />
          <Label htmlFor="isFreePreview">Aperçu gratuit</Label>
        </div>
      </div>

      {type === 'texte' ? (
        <div className="space-y-2">
          <Label>Contenu</Label>
          <RichTextEditor content={contentText} onChange={setContentText} />
        </div>
      ) : (
        <div className="space-y-3">
          <Label>Contenu ({type})</Label>
          {uploadConfig ? (
            <div className="flex items-center gap-3">
              <Label
                htmlFor="file-upload"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray hover:border-primary hover:text-primary"
              >
                <UploadCloud className="h-4 w-4" />
                {uploading ? 'Envoi…' : contentUrl ? 'Remplacer le fichier' : 'Envoyer un fichier'}
              </Label>
              <input
                id="file-upload"
                type="file"
                accept={uploadConfig.accept}
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {contentUrl && !contentUrl.startsWith('http') && (
                <span className="text-xs text-gray-400">Fichier prêt</span>
              )}
            </div>
          ) : null}
          <p className="text-xs text-gray-400">Ou collez une URL externe (YouTube, lien direct…) :</p>
          <Input
            placeholder="https://…"
            value={contentUrl.startsWith('http') ? contentUrl : ''}
            onChange={(e) => setContentUrl(e.target.value)}
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting || uploading}>
          {session ? 'Enregistrer' : 'Ajouter la session'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
