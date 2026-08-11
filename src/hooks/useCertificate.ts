import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface GenerateCertificateResult {
  success: boolean
  certificate_id: string
  pdf_url: string
  verify_token: string
  email_sent?: boolean
  already_existed?: boolean
}

async function generateCertificate(enrollmentId: string): Promise<GenerateCertificateResult> {
  const { data, error } = await supabase.functions.invoke<GenerateCertificateResult | { error: string }>(
    'generate-certificate',
    { body: { enrollment_id: enrollmentId } }
  )
  if (error) throw error
  if (!data || 'error' in data) throw new Error((data as { error?: string })?.error ?? 'Erreur inconnue')
  return data
}

/** Génère (ou récupère) le certificat d'une inscription complétée via l'Edge Function dédiée. */
export function useCertificate() {
  return useMutation({ mutationFn: generateCertificate })
}
