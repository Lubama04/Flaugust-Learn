import { useQuery } from '@tanstack/react-query'
import { Activity, Award, Percent, Users } from 'lucide-react'
import { fetchAdminPedagogiqueStats, formatDuration } from '@/lib/tracking'
import { formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorBox, MiniBarChart, ProgressBar, SummaryCard } from '@/components/tracking/TrackingParts'

const MONTHS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

export function AdminPedagogiquePanel() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-pedagogique'],
    queryFn: fetchAdminPedagogiqueStats,
    retry: false,
  })

  if (isLoading) return <LoadingSpinner label="Chargement du suivi pédagogique…" />
  if (isError) return <ErrorBox error={error} onRetry={() => void refetch()} />
  if (!data) return null

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Users className="h-5 w-5" />} label="Apprenants actifs" value={data.summary.active_learners} />
        <SummaryCard icon={<Percent className="h-5 w-5" />} label="Complétion moyenne" value={`${data.summary.avg_completion}%`} />
        <SummaryCard icon={<Activity className="h-5 w-5" />} label="Actifs cette semaine" value={data.summary.active_this_week} />
        <SummaryCard icon={<Award className="h-5 w-5" />} label="Certificats délivrés" value={data.summary.certificates_issued} />
      </div>
      <p className="-mt-4 text-xs text-gray">Temps d'apprentissage cumulé : {formatDuration(data.summary.total_time_seconds)}</p>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Formations par taux de complétion</h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Formation</th>
                  <th className="px-6 py-3 font-medium">Inscrits</th>
                  <th className="min-w-40 px-6 py-3 font-medium">Complétion moyenne</th>
                  <th className="px-6 py-3 font-medium">Terminés</th>
                  <th className="px-6 py-3 font-medium">Abandon</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c) => (
                  <tr key={c.course_id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3 font-medium text-dark">{c.title}</td>
                    <td className="px-6 py-3 text-gray">{c.enrollments}</td>
                    <td className="px-6 py-3">
                      <ProgressBar pct={c.avg_completion} />
                      <span className="text-xs text-gray">{c.avg_completion}%</span>
                    </td>
                    <td className="px-6 py-3 text-gray">{c.completed}</td>
                    <td className="px-6 py-3 text-gray">
                      {c.abandonment_rate}% ({c.abandoned})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Formateurs par engagement</h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Formateur</th>
                  <th className="px-6 py-3 font-medium">Formations</th>
                  <th className="px-6 py-3 font-medium">Apprenants</th>
                  <th className="px-6 py-3 font-medium">Complétion moyenne</th>
                  <th className="px-6 py-3 font-medium">Actifs cette semaine</th>
                </tr>
              </thead>
              <tbody>
                {data.formateurs.map((f) => (
                  <tr key={f.formateur_id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3 font-medium text-dark">{f.full_name || '-'}</td>
                    <td className="px-6 py-3 text-gray">{f.courses}</td>
                    <td className="px-6 py-3 text-gray">{f.learners}</td>
                    <td className="px-6 py-3 text-gray">{f.avg_completion}%</td>
                    <td className="px-6 py-3 text-gray">{f.active_this_week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Certificats délivrés par mois</h2>
        <Card>
          <CardContent className="pt-6">
            <MiniBarChart
              data={data.certificates_by_month.map((m) => ({
                label: MONTHS[Number(m.month.slice(5, 7)) - 1] ?? m.month,
                value: m.count,
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Apprenants inactifs depuis plus de 14 jours</h2>
        {data.inactive_learners.length === 0 ? (
          <p className="text-sm text-gray">Aucun apprenant inactif.</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Apprenant</th>
                    <th className="px-6 py-3 font-medium">Formation</th>
                    <th className="px-6 py-3 font-medium">Progression</th>
                    <th className="px-6 py-3 font-medium">Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inactive_learners.map((l, i) => (
                    <tr key={`${l.user_id}-${i}`} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3">
                        <div className="font-medium text-dark">{l.full_name || '-'}</div>
                        <div className="text-xs text-gray">{l.email}</div>
                      </td>
                      <td className="px-6 py-3 text-gray">{l.course_title}</td>
                      <td className="px-6 py-3 text-gray">{l.progress_pct}%</td>
                      <td className="px-6 py-3 text-gray">{l.last_activity ? formatDate(l.last_activity) : 'Jamais'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
