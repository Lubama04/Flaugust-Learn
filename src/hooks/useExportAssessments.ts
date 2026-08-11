import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { exportAssessmentsToDocx } from '@/lib/docx-export'
import { exportAssessmentsToPdf } from '@/lib/pdf-export'
import type { AssessmentExportData } from '@/types'

export type ExportFormat = 'docx' | 'pdf'

/** Récupère les données d'évaluations via l'Edge Function puis génère le fichier côté client. */
export function useExportAssessments() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportAssessments = async (enrollmentId: string, format: ExportFormat) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke<AssessmentExportData>(
        'export-assessments',
        { body: { enrollment_id: enrollmentId } }
      )
      if (fnError) throw fnError
      if (!data) throw new Error('Réponse vide')

      if (format === 'docx') {
        await exportAssessmentsToDocx(data)
      } else {
        exportAssessmentsToPdf(data)
      }

      if (userId) {
        await supabase.from('assessment_exports').insert({ user_id: userId, enrollment_id: enrollmentId, format })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'export")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { exportAssessments, isLoading, error }
}
