import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Award, BookOpen, CheckCircle2, Clock, FileText, Target } from 'lucide-react'
import { fetchApprenantOverview, formatDuration } from '@/lib/tracking'
import { formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorBox, ProgressBar, SummaryCard } from '@/components/tracking/TrackingParts'

export function MonEspacePage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['apprenant-overview'],
    queryFn: fetchApprenantOverview,
    retry: false,
  })

  if (isLoading) return <LoadingSpinner label="Chargement de votre espace…" />
  if (isError) return <ErrorBox error={error} onRetry={() => void refetch()} />
  if (!data) return null

  const inProgress = data.courses.filter((c) => c.progress_pct < 100)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-dark">Mon espace d'apprentissage</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Sessions terminées" value={data.stats.sessions_done} />
        <SummaryCard icon={<Clock className="h-5 w-5" />} label="Temps total" value={formatDuration(data.stats.time_spent_seconds)} />
        <SummaryCard icon={<Target className="h-5 w-5" />} label="Score moyen aux quiz" value={data.stats.avg_score === null ? '-' : `${data.stats.avg_score}%`} />
        <SummaryCard icon={<FileText className="h-5 w-5" />} label="Fiches remplies" value={data.stats.worksheets_filled} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Formations en cours</h2>
        {inProgress.length === 0 ? (
          <EmptyState icon={BookOpen} title="Aucune formation en cours" description="Explorez le catalogue pour commencer une formation." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {inProgress.map((c) => (
              <Card key={c.course_id}>
                <CardContent className="space-y-3 pt-6">
                  <p className="font-medium text-dark">{c.title}</p>
                  <ProgressBar pct={c.progress_pct} />
                  <p className="text-xs text-gray">
                    {c.progress_pct}% ({c.completed_sessions}/{c.total_sessions} sessions)
                  </p>
                  {c.next_session && <p className="text-sm text-gray">Prochaine session : {c.next_session}</p>}
                  <Link to="/formation/$slug/apprendre" params={{ slug: c.slug }}>
                    <Button size="sm">Continuer</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Mes fiches remplies</h2>
        {data.worksheets.length === 0 ? (
          <p className="text-sm text-gray">Aucune fiche remplie pour le moment.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-gray-50 p-2">
                {data.worksheets.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-dark">{w.session_title}</p>
                      <p className="text-xs text-gray">
                        {w.course_title} · {formatDate(w.last_saved_at)}
                      </p>
                    </div>
                    <Link to="/dossier" className="shrink-0 font-medium text-primary hover:underline">
                      Voir mon dossier
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Mes certificats</h2>
        {data.certificates.length === 0 ? (
          <p className="text-sm text-gray">Terminez une formation pour obtenir votre premier certificat.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.certificates.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center gap-3 pt-6">
                  <Award className="h-6 w-6 text-accent" />
                  <div className="text-sm">
                    <p className="font-medium text-dark">{c.course_title}</p>
                    <p className="text-xs text-gray">Délivré le {formatDate(c.issued_at)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Link to="/mes-certificats" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Tous mes certificats →
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Activité récente</h2>
        {data.recent_activity.length === 0 ? (
          <p className="text-sm text-gray">Aucune activité récente.</p>
        ) : (
          <ul className="space-y-2">
            {data.recent_activity.map((a, i) => (
              <li key={`${a.at}-${i}`} className="text-sm text-gray">
                <span className="font-medium text-dark">{a.title}</span> terminée dans {a.course_title}, le {formatDate(a.at)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
