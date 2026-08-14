import type { Tables } from './database'

export type Profile = Tables<'profiles'>
export type Organization = Tables<'organizations'>
export type Course = Tables<'courses'>
export type Module = Tables<'modules'>
export type CourseSession = Tables<'sessions'>
export type Exercise = Tables<'exercises'>
export type Enrollment = Tables<'enrollments'>
export type SessionProgress = Tables<'session_progress'>
export type ExerciseResult = Tables<'exercise_results'>
export type Certificate = Tables<'certificates'>
export type Notification = Tables<'notifications'>
export type AssessmentExport = Tables<'assessment_exports'>

/** Forme retournée par les RPC publiques verify_certificate_by_token / get_certificate_by_id. */
export interface PublicCertificate {
  id: string
  student_name: string
  course_title: string
  formateur_name: string
  final_score: number
  duration_hours: number
  issued_at: string
  verify_token?: string
}

/** Forme retournée par l'Edge Function export-assessments. */
export interface AssessmentExportItem {
  exercise_title: string
  exercise_type: string
  is_final_exam: boolean
  session_title: string
  module_title: string
  questions: Array<{ id?: string; prompt?: string; text?: string }>
  user_answers: Record<string, unknown>
  score: number
  pass_score: number
  passed: boolean
  attempt_number: number
  submitted_at: string
}
export interface AssessmentExportData {
  student: { full_name: string; email: string } | null
  course: { title: string; duration_hours: number } | null
  generated_at: string
  total_exercises: number
  passed_exercises: number
  assessments: AssessmentExportItem[]
}
export type Payment = Tables<'payments'>
export type LearnerNote = Tables<'learner_notes'>
export type CourseRating = Tables<'course_ratings'>
export type CourseResource = Tables<'course_resources'>
export type CourseMessage = Tables<'course_messages'>
export type FormationSchedule = Tables<'formation_schedules'>
export type PushSubscriptionRow = Tables<'push_subscriptions'>
export type AdminLog = Tables<'admin_logs'>
export type ResourceAccessLog = Tables<'resource_access_logs'>
export type LearnerWorksheet = Tables<'learner_worksheets'>

export type UserRole = Profile['role']
export type EnrollmentStatus = Enrollment['status']
export type CourseStatus = Course['status']
export type IndexingStatus = 'non_indexe' | 'en_cours' | 'indexe' | 'echec'

/** Un champ d'une fiche interactive : soit un champ texte, soit un tableau configurable. */
export interface WorksheetField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'table'
  placeholder?: string
  table_config?: {
    cols: string[]
    /** Nombre de lignes vides éditables, ou lignes pré-remplies (gabarit avec cellules vides à compléter). */
    rows: number | string[][]
  }
}

/** Structure de sessions.worksheet_schema : null = pas de fiche pour cette session. */
export interface WorksheetSchema {
  title: string
  fields: WorksheetField[]
}

/** Valeur d'un champ dans learner_worksheets.worksheet_data : une chaîne pour text/textarea, une grille pour table. */
export type WorksheetFieldValue = string | string[][]

/** Structure de learner_worksheets.worksheet_data. */
export interface WorksheetData {
  fields: Array<{ id: string; value: WorksheetFieldValue }>
}

/** Stats agrégées retournées par la RPC publique get_platform_stats. */
export interface PlatformStats {
  courses: number
  learners: number
  enrollments: number
  certificates: number
}

/** Une source citée par l'IA dans une réponse du chat de formation. */
export interface AiChatSource {
  resource_id: string
  title: string
  excerpt: string
}
