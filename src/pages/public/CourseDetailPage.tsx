import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { Clock, Layers, FileText, Lock, PlayCircle, Award, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import { courseDetailRoute } from '@/router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { DownloadableResources } from '@/components/resources/DownloadableResources'
import { formatPrice } from '@/lib/utils'

async function fetchCourseBySlug(slug: string) {
  const { data: course, error } = await supabase
    .from('courses')
    .select('*, profiles!courses_formateur_id_fkey(full_name)')
    .eq('slug', slug)
    .single()
  if (error) throw error

  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('*, sessions(id, title, type, duration_minutes, order_index, is_free_preview)')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })
  if (modulesError) throw modulesError

  return { course, modules }
}

async function fetchMyEnrollment(courseId: string, userId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function fetchMyCertificate(courseId: string, userId: string) {
  const { data, error } = await supabase
    .from('certificates')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export function CourseDetailPage() {
  const { slug } = courseDetailRoute.useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)

  const { data, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => fetchCourseBySlug(slug),
  })

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', data?.course.id, session?.user.id],
    queryFn: () => fetchMyEnrollment(data!.course.id, session!.user.id),
    enabled: !!data?.course.id && !!session?.user.id,
  })

  const { data: certificate } = useQuery({
    queryKey: ['certificate', data?.course.id, session?.user.id],
    queryFn: () => fetchMyCertificate(data!.course.id, session!.user.id),
    enabled: !!data?.course.id && !!session?.user.id && enrollment?.status === 'complete',
  })

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('non connecté')
      const { error } = await supabase
        .from('enrollments')
        .insert({ course_id: data!.course.id, user_id: session.user.id })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Inscription envoyée ! En attente de validation.')
      void queryClient.invalidateQueries({ queryKey: ['enrollment'] })
    },
    onError: () => toast.error("Erreur lors de l'inscription"),
  })

  const handleEnrollClick = () => {
    if (!session) {
      void navigate({ to: '/login', search: { redirect: `/formation/${slug}` } as never })
      return
    }
    enrollMutation.mutate()
  }

  if (isLoading) return <LoadingSpinner label="Chargement de la formation…" />
  if (!data) return null

  const { course, modules } = data
  const formateurName = (course as unknown as { profiles?: { full_name?: string } }).profiles
    ?.full_name

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex h-56 items-center justify-center overflow-hidden rounded-xl bg-lightGray">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-gray-300">Pas d'image</span>
            )}
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold text-dark">{course.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray">
            <Badge variant="gray">{course.level}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {course.duration_hours} h
            </span>
            {formateurName && <span>Par {formateurName}</span>}
          </div>
          {course.description ? (
            <div
              className="prose prose-sm mt-4 max-w-none text-gray"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.description) }}
            />
          ) : (
            <p className="mt-4 text-gray">{course.short_description}</p>
          )}

          <h2 className="mt-8 text-xl font-semibold text-dark">Plan de la formation</h2>
          <div className="mt-4 space-y-3">
            {modules && modules.length > 0 ? (
              modules.map((module) => (
                <Card key={module.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 font-medium text-dark">
                      <Layers className="h-4 w-4 text-primary" /> {module.title}
                    </div>
                    <ul className="mt-3 space-y-2">
                      {(module.sessions ?? [])
                        .slice()
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((s) => (
                          <li key={s.id} className="flex items-center gap-2 text-sm text-gray">
                            {s.is_free_preview ? (
                              <PlayCircle className="h-4 w-4 text-secondary" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-300" />
                            )}
                            {s.title}
                            {s.duration_minutes > 0 && (
                              <span className="text-xs text-gray-400">· {s.duration_minutes} min</span>
                            )}
                          </li>
                        ))}
                    </ul>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="flex items-center gap-2 text-sm text-gray">
                <FileText className="h-4 w-4" /> Le contenu détaillé sera bientôt disponible.
              </p>
            )}
          </div>

          {(enrollment?.status === 'actif' || enrollment?.status === 'complete') && (
            <>
              <h2 className="mt-8 text-xl font-semibold text-dark">Ressources téléchargeables</h2>
              <div className="mt-4">
                <DownloadableResources courseId={course.id} enrollmentId={enrollment.id} />
              </div>
            </>
          )}
        </div>

        <div>
          <Card className="sticky top-24">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{formatPrice(course.price_fcfa)}</div>

              {enrollment?.status === 'complete' ? (
                <div className="mt-4 space-y-3">
                  <p className="rounded-lg bg-lime/10 p-3 text-sm text-lime">
                    Formation complétée ✅
                  </p>
                  {certificate && (
                    <Link to="/mes-certificats">
                      <Button variant="outline" className="w-full">
                        <Award className="mr-2 h-4 w-4" /> Voir mon certificat
                      </Button>
                    </Link>
                  )}
                  <Link to="/formation/$slug/discussion" params={{ slug }}>
                    <Button variant="outline" className="w-full">
                      <MessageCircle className="mr-2 h-4 w-4" /> Discussion
                    </Button>
                  </Link>
                </div>
              ) : enrollment?.status === 'actif' ? (
                <div className="mt-4 space-y-2">
                  <Link to="/formation/$slug/apprendre" params={{ slug }} className="block">
                    <Button className="w-full" size="lg">
                      Reprendre →
                    </Button>
                  </Link>
                  <Link to="/formation/$slug/discussion" params={{ slug }}>
                    <Button variant="outline" className="w-full">
                      <MessageCircle className="mr-2 h-4 w-4" /> Discussion
                    </Button>
                  </Link>
                </div>
              ) : enrollment?.status === 'en_attente' ? (
                <p className="mt-4 rounded-lg bg-accent/10 p-3 text-sm text-accent">
                  Votre inscription est en cours de validation.
                </p>
              ) : enrollment?.status === 'suspendu' ? (
                <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm text-gray">
                  Votre inscription n'a pas été validée. Contactez le formateur.
                </p>
              ) : (
                <Button
                  className="mt-4 w-full"
                  size="lg"
                  onClick={handleEnrollClick}
                  disabled={enrollMutation.isPending}
                >
                  S'inscrire
                </Button>
              )}

              <Link to="/catalogue" className="mt-4 block text-center text-sm text-gray hover:text-primary">
                ← Retour au catalogue
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
