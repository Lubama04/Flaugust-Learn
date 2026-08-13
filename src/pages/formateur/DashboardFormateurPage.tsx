import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus, BookOpen, ClipboardCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface PendingEnrollmentPreview {
  id: string
  profiles: { full_name: string } | null
  courses: { title: string } | null
}

async function fetchPendingEnrollmentsPreview(formateurId: string): Promise<PendingEnrollmentPreview[]> {
  // enrollments a deux FK vers profiles (user_id ET validated_by) : il faut désambiguïser
  // l'embed, sinon PostgREST renvoie une erreur (PGRST201) et la requête échoue silencieusement.
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, profiles:profiles!enrollments_user_id_fkey(full_name), courses!inner(title, formateur_id)')
    .eq('status', 'en_attente')
    .eq('courses.formateur_id', formateurId)
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) throw error
  return data as unknown as PendingEnrollmentPreview[]
}

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  en_revision: 'En révision',
  publie: 'Publié',
  archive: 'Archivé',
}

async function fetchMyCourses(formateurId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('formateur_id', formateurId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function DashboardFormateurPage() {
  const userId = useAuthStore((s) => s.session?.user.id)

  const { data: courses, isLoading } = useQuery({
    queryKey: ['my-courses', userId],
    queryFn: () => fetchMyCourses(userId!),
    enabled: !!userId,
  })

  const { data: pendingEnrollments, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-enrollments-preview', userId],
    queryFn: () => fetchPendingEnrollmentsPreview(userId!),
    enabled: !!userId,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">Mes formations</h1>
        <Link to="/formateur/formations/nouvelle">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Créer une formation
          </Button>
        </Link>
      </div>

      {!pendingLoading && pendingEnrollments && pendingEnrollments.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold text-dark">
                <ClipboardCheck className="h-4 w-4 text-accent" />
                {pendingEnrollments.length} inscription{pendingEnrollments.length > 1 ? 's' : ''} en attente
              </p>
              <Link to="/formateur/inscriptions" className="text-sm font-medium text-primary hover:underline">
                Voir tout →
              </Link>
            </div>
            <ul className="space-y-1.5">
              {pendingEnrollments.map((e) => (
                <li key={e.id} className="text-sm text-gray">
                  <span className="font-medium text-dark">{e.profiles?.full_name ?? '—'}</span>
                  {' — '}
                  {e.courses?.title ?? '—'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <LoadingSpinner label="Chargement…" />
      ) : !courses || courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Vous n'avez créé aucune formation"
          description="Cliquez sur « Créer une formation » pour démarrer."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} to="/formateur/formations/$courseId/editer" params={{ courseId: course.id }}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-dark">{course.title}</p>
                    <Badge variant="gray">{STATUS_LABELS[course.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray">{course.enrolled_count} inscrit(s)</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Link to="/formateur/inscriptions" className="inline-block text-sm font-medium text-primary hover:underline">
        Voir les inscriptions en attente →
      </Link>
    </div>
  )
}
