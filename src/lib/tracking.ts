import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/utils'

export type RiskLevel = 'completed' | 'inactive' | 'behind' | 'good' | 'ok'

export interface TrackedLearner {
  user_id: string
  full_name: string | null
  email: string | null
  course_id: string
  course_title: string
  enrollment_id: string
  status: string
  progress_pct: number
  completed_sessions: number
  total_sessions: number
  time_spent_seconds: number
  avg_score: number | null
  last_activity: string | null
  risk: RiskLevel
}

export interface FormateurDashboard {
  summary: {
    active_learners: number
    avg_completion: number
    active_this_week: number
    certificates_issued: number
  }
  courses: { id: string; title: string }[]
  learners: TrackedLearner[]
}

export interface ApprenantProgression {
  enrollment_id: string
  course_id: string
  course_title: string
  learner: { id: string; full_name: string | null; email: string | null } | null
  status: string
  progress_pct: number
  total_sessions: number
  completed_sessions: number
  time_spent_seconds: number
  last_activity: string | null
  risk: RiskLevel
  avg_score: number | null
  worksheets_filled: number
  certificate: { id: string; issued_at: string } | null
  next_session: { id: string; title: string } | null
  sessions: {
    id: string
    title: string
    module_title: string
    type: string
    is_completed: boolean
    time_spent_seconds: number
    completed_at: string | null
    has_worksheet: boolean
    worksheet_filled: boolean
  }[]
  activity_7d: { day: string; seconds: number; sessions_completed: number }[]
}

export interface ApprenantOverview {
  stats: { sessions_done: number; time_spent_seconds: number; avg_score: number | null; worksheets_filled: number }
  courses: {
    course_id: string
    title: string
    slug: string
    progress_pct: number
    status: string
    completed_sessions: number
    total_sessions: number
    next_session: string | null
  }[]
  worksheets: { id: string; session_title: string; course_title: string; last_saved_at: string }[]
  certificates: { id: string; course_title: string; issued_at: string; verify_token: string }[]
  recent_activity: { type: string; title: string; course_title: string; at: string }[]
}

export interface AdminPedagogiqueStats {
  summary: {
    active_learners: number
    avg_completion: number
    active_this_week: number
    certificates_issued: number
    total_time_seconds: number
  }
  courses: {
    course_id: string
    title: string
    enrollments: number
    avg_completion: number
    completed: number
    abandoned: number
    abandonment_rate: number
  }[]
  formateurs: {
    formateur_id: string
    full_name: string | null
    courses: number
    learners: number
    avg_completion: number
    active_this_week: number
  }[]
  inactive_learners: {
    user_id: string
    full_name: string | null
    email: string | null
    course_title: string
    progress_pct: number
    last_activity: string | null
    enrolled_at: string
  }[]
  certificates_by_month: { month: string; count: number }[]
}

const TIMEOUT_MSG = 'Le chargement prend trop de temps. Vérifiez votre connexion et réessayez.'

async function rpc<T>(fn: string, args?: Record<string, string>): Promise<T> {
  const { data, error } = await withTimeout(supabase.rpc(fn as never, args as never), 12_000, TIMEOUT_MSG)
  if (error) throw error
  return data as T
}

export const fetchFormateurDashboard = (formateurId: string) =>
  rpc<FormateurDashboard>('get_formateur_dashboard', { p_formateur_id: formateurId })

export const fetchApprenantProgression = (apprenantId: string, courseId: string) =>
  rpc<ApprenantProgression | null>('get_apprenant_progression', {
    p_apprenant_id: apprenantId,
    p_course_id: courseId,
  })

export const fetchApprenantOverview = () => rpc<ApprenantOverview>('get_apprenant_overview')

export const fetchAdminPedagogiqueStats = () => rpc<AdminPedagogiqueStats>('get_admin_pedagogique_stats')

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

export const RISK_META: Record<RiskLevel, { label: string; emoji: string; className: string }> = {
  completed: { label: 'Terminé', emoji: '⭐', className: 'bg-accent/15 text-accent' },
  inactive: { label: 'Inactif', emoji: '🔴', className: 'bg-red-50 text-red-600' },
  behind: { label: 'En retard', emoji: '🟡', className: 'bg-yellow-50 text-yellow-700' },
  good: { label: 'Bonne progression', emoji: '🟢', className: 'bg-secondary/10 text-secondary' },
  ok: { label: 'En cours', emoji: '🔵', className: 'bg-gray-100 text-gray' },
}
