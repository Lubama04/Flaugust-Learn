import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Award, CheckCircle2, Circle, Clock, FileText, MessageSquare, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import { fetchApprenantProgression, formatDuration } from '@/lib/tracking'
import { formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBox, MiniBarChart, ProgressBar, RiskBadge, SummaryCard } from '@/components/tracking/TrackingParts'

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export function SuiviDetailPage() {
  const { apprenantId, courseId } = useParams({ strict: false }) as { apprenantId: string; courseId: string }
  const formateurId = useAuthStore((s) => s.session?.user.id)
  const toast = useToast()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')

  const queryKey = ['apprenant-progression', apprenantId, courseId]
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchApprenantProgression(apprenantId, courseId),
    retry: false,
  })

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('course_messages').insert({
        course_id: courseId,
        user_id: formateurId!,
        is_ai: false,
        is_private: true,
        private_recipient_id: apprenantId,
        content: message.trim(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setMessage('')
      toast.success('Message envoyé')
    },
    onError: () => toast.error("Impossible d'envoyer le message"),
  })

  const validateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.rpc('formateur_validate_session', {
        p_enrollment_id: data!.enrollment_id,
        p_session_id: sessionId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Session validée')
      void queryClient.invalidateQueries({ queryKey })
      void queryClient.invalidateQueries({ queryKey: ['formateur-dashboard'] })
    },
    onError: () => toast.error('Impossible de valider cette session'),
  })

  const issueCertificate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('formateur_issue_certificate', { p_enrollment_id: data!.enrollment_id })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Certificat délivré')
      void queryClient.invalidateQueries({ queryKey })
      void queryClient.invalidateQueries({ queryKey: ['formateur-dashboard'] })
    },
    onError: () => toast.error('Impossible de délivrer le certificat'),
  })

  const handleIssue = () => {
    if (!data) return
    const incomplete = data.progress_pct < 100
    const ok = window.confirm(
      incomplete
        ? `La progression n'est que de ${data.progress_pct}%. Délivrer quand même le certificat à cet apprenant ?`
        : 'Délivrer le certificat à cet apprenant ?'
    )
    if (ok) issueCertificate.mutate()
  }

  return (
    <div className="space-y-6">
      <Link to="/formateur/suivi" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour au suivi
      </Link>

      {isLoading ? (
        <LoadingSpinner label="Chargement…" />
      ) : isError ? (
        <ErrorBox error={error} onRetry={() => void refetch()} />
      ) : !data ? (
        <EmptyState icon={Target} title="Aucune inscription active" description="Cet apprenant n'a pas d'inscription active à cette formation." />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-dark">{data.learner?.full_name || 'Apprenant'}</h1>
              <p className="text-sm text-gray">
                {data.learner?.email} · {data.course_title}
              </p>
            </div>
            <RiskBadge risk={data.risk} />
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-dark">Progression globale</span>
                <span className="text-gray">
                  {data.progress_pct}% ({data.completed_sessions}/{data.total_sessions} sessions)
                </span>
              </div>
              <ProgressBar pct={data.progress_pct} />
              <p className="mt-2 text-xs text-gray">
                Dernière activité : {data.last_activity ? formatDate(data.last_activity) : 'aucune'}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={<Clock className="h-5 w-5" />} label="Temps passé" value={formatDuration(data.time_spent_seconds)} />
            <SummaryCard icon={<Target className="h-5 w-5" />} label="Score moyen aux quiz" value={data.avg_score === null ? '-' : `${data.avg_score}%`} />
            <SummaryCard icon={<FileText className="h-5 w-5" />} label="Fiches remplies" value={data.worksheets_filled} />
            <SummaryCard
              icon={<Award className="h-5 w-5" />}
              label="Certificat"
              value={data.certificate ? `Délivré le ${formatDate(data.certificate.issued_at)}` : 'Non délivré'}
            />
          </div>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 text-sm font-semibold text-dark">Activité des 7 derniers jours (minutes)</h2>
              <MiniBarChart
                data={data.activity_7d.map((d) => ({
                  label: WEEKDAYS[new Date(d.day + 'T12:00:00').getDay()] ?? '',
                  value: Math.round(d.seconds / 60),
                }))}
                formatValue={(v) => `${v}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <h2 className="px-6 pt-6 text-sm font-semibold text-dark">Détail par session</h2>
              <ul className="divide-y divide-gray-50 p-2">
                {data.sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    {s.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-secondary" aria-label="Terminée" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-gray-300" aria-label="Non terminée" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-dark">{s.title}</p>
                      <p className="text-xs text-gray">
                        {s.module_title}
                        {s.time_spent_seconds > 0 && ` · ${formatDuration(s.time_spent_seconds)}`}
                        {s.completed_at && ` · terminée le ${formatDate(s.completed_at)}`}
                        {s.has_worksheet && (s.worksheet_filled ? ' · fiche remplie' : ' · fiche non remplie')}
                      </p>
                    </div>
                    {!s.is_completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={validateSession.isPending}
                        onClick={() => validateSession.mutate(s.id)}
                      >
                        Valider
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-dark">
                <MessageSquare className="h-4 w-4" /> Envoyer un message à l'apprenant
              </h2>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Un mot d'encouragement ou de relance…"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => sendMessage.mutate()} disabled={!message.trim() || sendMessage.isPending}>
                  Envoyer
                </Button>
                {!data.certificate && (
                  <Button variant="outline" onClick={handleIssue} disabled={issueCertificate.isPending}>
                    <Award className="mr-2 h-4 w-4" /> Délivrer le certificat
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
