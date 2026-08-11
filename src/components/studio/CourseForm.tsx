import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import { courseFormSchema, type CourseFormInput } from '@/lib/validations'
import { slugify } from '@/lib/utils'
import { COURSE_LEVELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Course } from '@/types'

const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024
const THUMBNAIL_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface CourseFormProps {
  /** Cours existant (mode édition) ; absent = mode création. */
  course?: Course
  onSaved: (course: Course) => void
}

function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function toTags(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || 'formation'
  let candidate = base
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from('courses').select('id').eq('slug', candidate)
    if (excludeId) query = query.neq('id', excludeId)
    const { data } = await query.maybeSingle()
    if (!data) return candidate
    attempt += 1
    candidate = `${base}-${attempt + 1}`
  }
}

export function CourseForm({ course, onSaved }: CourseFormProps) {
  const toast = useToast()
  const userId = useAuthStore((s) => s.session?.user.id)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnail_url ?? null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormInput>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: course?.title ?? '',
      shortDescription: course?.short_description ?? '',
      description: course?.description ?? '',
      level: (course?.level as CourseFormInput['level']) ?? 'debutant',
      language: course?.language ?? 'fr',
      durationHours: course?.duration_hours ?? 0,
      isFree: course?.is_free ?? false,
      priceFcfa: course?.price_fcfa ?? 0,
      passScoreFinal: course?.pass_score_final ?? 70,
      maxAttemptsFinal: course?.max_attempts_final ?? 3,
      certificateEnabled: course?.certificate_enabled ?? true,
      tags: course?.tags?.join(', ') ?? '',
      objectives: course?.objectives?.join('\n') ?? '',
      prerequisites: course?.prerequisites?.join('\n') ?? '',
    },
  })

  useEffect(() => {
    if (!course) return
    reset({
      title: course.title,
      shortDescription: course.short_description,
      description: course.description,
      level: course.level as CourseFormInput['level'],
      language: course.language,
      durationHours: course.duration_hours,
      isFree: course.is_free,
      priceFcfa: course.price_fcfa,
      passScoreFinal: course.pass_score_final,
      maxAttemptsFinal: course.max_attempts_final,
      certificateEnabled: course.certificate_enabled,
      tags: course.tags.join(', '),
      objectives: course.objectives.join('\n'),
      prerequisites: course.prerequisites.join('\n'),
    })
    setThumbnailUrl(course.thumbnail_url)
  }, [course, reset])

  const onSubmit = async (values: CourseFormInput) => {
    if (!userId) return

    const payload = {
      title: values.title,
      short_description: values.shortDescription,
      description: values.description,
      level: values.level,
      language: values.language,
      duration_hours: values.durationHours,
      is_free: values.isFree,
      price_fcfa: values.isFree ? 0 : values.priceFcfa,
      pass_score_final: values.passScoreFinal,
      max_attempts_final: values.maxAttemptsFinal,
      certificate_enabled: values.certificateEnabled,
      tags: toTags(values.tags ?? ''),
      objectives: toLines(values.objectives ?? ''),
      prerequisites: toLines(values.prerequisites ?? ''),
    }

    try {
      if (course) {
        const { data, error } = await supabase
          .from('courses')
          .update(payload)
          .eq('id', course.id)
          .select()
          .single()
        if (error) throw error
        toast.success('Formation mise à jour')
        onSaved(data)
      } else {
        const slug = await generateUniqueSlug(values.title)
        const { data, error } = await supabase
          .from('courses')
          .insert({ ...payload, slug, formateur_id: userId, status: 'brouillon' })
          .select()
          .single()
        if (error) throw error
        toast.success('Formation créée — vous pouvez maintenant ajouter des modules')
        onSaved(data)
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement de la formation")
    }
  }

  const handleThumbnailChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !course) return

    if (!THUMBNAIL_ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format non autorisé (JPEG, PNG, WebP ou GIF)')
      return
    }
    if (file.size > THUMBNAIL_MAX_BYTES) {
      toast.error('Image trop volumineuse (5 Mo max)')
      return
    }

    setUploadingThumbnail(true)
    try {
      const ext = file.type.split('/')[1]
      const path = `${course.id}/thumbnail.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('course-thumbnails')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage.from('course-thumbnails').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('courses')
        .update({ thumbnail_url: publicUrl.publicUrl })
        .eq('id', course.id)
      if (updateError) throw updateError

      setThumbnailUrl(publicUrl.publicUrl)
      toast.success('Image mise à jour')
    } catch {
      toast.error("Erreur lors de l'envoi de l'image")
    } finally {
      setUploadingThumbnail(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {course && (
        <div className="space-y-2">
          <Label>Image de couverture</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg bg-lightGray">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-gray-400">Aucune image</span>
              )}
            </div>
            <div>
              <Label htmlFor="thumbnail" className="cursor-pointer text-sm text-primary hover:underline">
                {uploadingThumbnail ? 'Envoi…' : 'Changer l’image'}
              </Label>
              <input
                id="thumbnail"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleThumbnailChange}
                disabled={uploadingThumbnail}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Titre de la formation</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="shortDescription">Description courte</Label>
        <Input id="shortDescription" {...register('shortDescription')} />
        {errors.shortDescription && <p className="text-sm text-red-600">{errors.shortDescription.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description complète</Label>
        <Textarea id="description" rows={5} {...register('description')} />
        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="level">Niveau</Label>
          <select
            id="level"
            {...register('level')}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
          >
            {COURSE_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationHours">Durée totale (heures)</Label>
          <Input id="durationHours" type="number" step="0.5" min="0" {...register('durationHours', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-2 pt-6">
          <input id="isFree" type="checkbox" {...register('isFree')} className="h-4 w-4" />
          <Label htmlFor="isFree">Formation gratuite</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceFcfa">Prix (FCFA)</Label>
          <Input id="priceFcfa" type="number" min="0" {...register('priceFcfa', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="passScoreFinal">Score de réussite examen final (%)</Label>
          <Input id="passScoreFinal" type="number" min="0" max="100" {...register('passScoreFinal', { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxAttemptsFinal">Tentatives max. examen final</Label>
          <Input id="maxAttemptsFinal" type="number" min="1" {...register('maxAttemptsFinal', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input id="certificateEnabled" type="checkbox" {...register('certificateEnabled')} className="h-4 w-4" />
        <Label htmlFor="certificateEnabled">Délivrer un certificat à la réussite</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
        <Input id="tags" placeholder="gestion, leadership, finance" {...register('tags')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objectives">Objectifs pédagogiques (un par ligne)</Label>
        <Textarea id="objectives" rows={3} {...register('objectives')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prerequisites">Prérequis (un par ligne)</Label>
        <Textarea id="prerequisites" rows={3} {...register('prerequisites')} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {course ? 'Enregistrer les modifications' : 'Créer la formation'}
      </Button>
    </form>
  )
}
