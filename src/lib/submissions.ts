import { supabase } from '@/lib/supabase'

export type SubmissionStatus = 'en_attente' | 'soumis' | 'valide_ia' | 'valide_formateur' | 'rejete'

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  en_attente: 'En attente',
  soumis: 'À réviser',
  valide_ia: 'Validé par l\'IA',
  valide_formateur: 'Validé par le formateur',
  rejete: 'Rejeté',
}

export const SUBMISSION_MODE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  texte_libre: 'Texte libre',
  upload_document: 'Document',
  google_doc: 'Google Docs',
  google_sheet: 'Google Sheets',
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/** Déclenche la validation IA d'une soumission. Un échec n'est pas bloquant : le formateur la révisera. */
export async function requestAiValidation(submissionId: string) {
  const { data, error } = await supabase.functions.invoke<{
    status: SubmissionStatus
    score?: number
    feedback?: string
    passed?: boolean
    pending_review?: boolean
  }>('validate-exercise', { body: { submission_id: submissionId } })
  if (error) throw error
  return data
}
