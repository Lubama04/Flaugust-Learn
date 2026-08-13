import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BookOpen, Award, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

async function fetchMyEnrollments(userId: string) {
  // "actif" (en cours) et "complete" (terminée) doivent apparaître toutes les deux ici —
  // sinon les formations terminées disparaissent du tableau de bord (progress_pct=100 mais
  // status='complete' les excluait auparavant d'un filtre status='actif' trop strict).
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, courses(title, slug, duration_hours)')
    .eq('user_id', userId)
    .in('status', ['actif', 'complete'])
  if (error) throw error
  return data
}

async function fetchMyCertificatesCount(userId: string) {
  const { count, error } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

export function DashboardPage() {
  const session = useAuthStore((s) => s.session)
  const { data: profile } = useProfile()
  const userId = session?.user.id

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments', userId],
    queryFn: () => fetchMyEnrollments(userId!),
    enabled: !!userId,
  })

  const { data: certificatesCount } = useQuery({
    queryKey: ['my-certificates-count', userId],
    queryFn: () => fetchMyCertificatesCount(userId!),
    enabled: !!userId,
  })

  const inProgress = (enrollments ?? []).filter((e) => e.progress_pct < 100)
  const completed = (enrollments ?? []).filter((e) => e.progress_pct >= 100)
  const totalHours = (enrollments ?? []).reduce(
    (sum, e) => sum + ((e as { courses?: { duration_hours?: number } }).courses?.duration_hours ?? 0) * (e.progress_pct / 100),
    0
  )

  if (isLoading) return <LoadingSpinner label="Chargement du tableau de bord…" />

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-dark">
        Bonjour {profile?.full_name?.split(' ')[0] || 'Apprenant'} 👋
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Clock} label="Heures d'apprentissage" value={totalHours.toFixed(1)} />
        <StatCard icon={BookOpen} label="Formations complétées" value={String(completed.length)} />
        <StatCard icon={Award} label="Certificats obtenus" value={String(certificatesCount ?? 0)} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Mes formations en cours</h2>
        {inProgress.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Aucune formation en cours"
            description="Explorez le catalogue pour commencer votre première formation."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((e) => {
              const course = (e as { courses?: { title?: string; slug?: string } }).courses
              if (!course?.slug) return null
              return (
                <Link key={e.id} to="/formation/$slug/apprendre" params={{ slug: course.slug }} className="block h-full">
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="pt-6">
                      <p className="font-medium text-dark">{course.title}</p>
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-lime" style={{ width: `${e.progress_pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-gray">{e.progress_pct}% complété</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Mes certificats</h2>
        {(certificatesCount ?? 0) === 0 && (
          <EmptyState
            icon={Award}
            title="Aucun certificat pour le moment"
            description="Terminez une formation avec succès pour obtenir votre premier certificat."
          />
        )}
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xl font-bold text-dark">{value}</div>
          <div className="text-xs text-gray">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
