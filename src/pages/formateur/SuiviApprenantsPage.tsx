import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Users, Percent, Activity, Award } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { fetchFormateurDashboard, formatDuration } from '@/lib/tracking'
import { formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorBox, ProgressBar, RiskBadge, SummaryCard } from '@/components/tracking/TrackingParts'

export function SuiviApprenantsPage() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const [courseFilter, setCourseFilter] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['formateur-dashboard', userId],
    queryFn: () => fetchFormateurDashboard(userId!),
    enabled: !!userId,
    retry: false,
  })

  const learners = useMemo(
    () => (data?.learners ?? []).filter((l) => !courseFilter || l.course_id === courseFilter),
    [data, courseFilter]
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark">Suivi des apprenants</h1>

      {isLoading ? (
        <LoadingSpinner label="Chargement du suivi…" />
      ) : isError ? (
        <ErrorBox error={error} onRetry={() => void refetch()} />
      ) : !data ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={<Users className="h-5 w-5" />} label="Apprenants actifs" value={data.summary.active_learners} />
            <SummaryCard icon={<Percent className="h-5 w-5" />} label="Taux de complétion moyen" value={`${data.summary.avg_completion}%`} />
            <SummaryCard icon={<Activity className="h-5 w-5" />} label="Actifs cette semaine" value={data.summary.active_this_week} />
            <SummaryCard icon={<Award className="h-5 w-5" />} label="Certificats délivrés" value={data.summary.certificates_issued} />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="course-filter" className="text-sm text-gray">
              Formation
            </label>
            <select
              id="course-filter"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-dark"
            >
              <option value="">Toutes mes formations</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {learners.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun apprenant à suivre"
              description="Les apprenants dont l'inscription est validée apparaîtront ici."
            />
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-6 py-3 font-medium">Apprenant</th>
                      <th className="px-6 py-3 font-medium">Formation</th>
                      <th className="min-w-40 px-6 py-3 font-medium">Progression</th>
                      <th className="px-6 py-3 font-medium">Temps</th>
                      <th className="px-6 py-3 font-medium">Dernier accès</th>
                      <th className="px-6 py-3 font-medium">Statut</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {learners.map((l) => (
                      <tr key={l.enrollment_id} className="border-b border-gray-50 last:border-0">
                        <td className="px-6 py-3">
                          <div className="font-medium text-dark">{l.full_name || '-'}</div>
                          <div className="text-xs text-gray">{l.email}</div>
                        </td>
                        <td className="px-6 py-3 text-gray">{l.course_title}</td>
                        <td className="px-6 py-3">
                          <ProgressBar pct={l.progress_pct} />
                          <div className="mt-1 text-xs text-gray">
                            {l.progress_pct}% ({l.completed_sessions}/{l.total_sessions} sessions)
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray">{formatDuration(l.time_spent_seconds)}</td>
                        <td className="px-6 py-3 text-gray">{l.last_activity ? formatDate(l.last_activity) : 'Jamais'}</td>
                        <td className="px-6 py-3">
                          <RiskBadge risk={l.risk} />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            to="/formateur/suivi/$apprenantId/$courseId"
                            params={{ apprenantId: l.user_id, courseId: l.course_id }}
                            className="font-medium text-primary hover:underline"
                          >
                            Détail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
