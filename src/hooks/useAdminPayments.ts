import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import type { Payment } from '@/types'

export interface PaymentRow extends Payment {
  profiles: { full_name: string; email: string } | null
  courses: { title: string } | null
}

async function fetchPayments(): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, profiles!payments_user_id_fkey(full_name, email), courses(title)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data as unknown as PaymentRow[]
}

interface RecordCashPaymentParams {
  userId: string
  courseId: string
  amountFcfa: number
  notes: string
}

/** Paiements espèces (guichet) : enregistrement + activation d'inscription, historique. */
export function useAdminPayments() {
  const adminId = useAuthStore((s) => s.session?.user.id)
  const toast = useToast()
  const queryClient = useQueryClient()

  const paymentsQuery = useQuery({ queryKey: ['admin-payments'], queryFn: fetchPayments })

  const recordCashPayment = useMutation({
    mutationFn: async (params: RecordCashPaymentParams) => {
      if (!adminId) throw new Error('Non authentifié')
      const now = new Date().toISOString()

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: params.userId,
          course_id: params.courseId,
          amount_fcfa: params.amountFcfa,
          provider: 'especes',
          status: 'valide',
          notes: params.notes || null,
          validated_by: adminId,
          validated_at: now,
        })
        .select()
        .single()
      if (paymentError) throw paymentError

      // Active (ou crée) l'inscription correspondante — un paiement espèces validé
      // vaut inscription active, sans passer par le flux de demande habituel.
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('user_id', params.userId)
        .eq('course_id', params.courseId)
        .maybeSingle()

      if (existingEnrollment) {
        if (existingEnrollment.status !== 'actif' && existingEnrollment.status !== 'complete') {
          await supabase
            .from('enrollments')
            .update({ status: 'actif', validated_by: adminId, validated_at: now })
            .eq('id', existingEnrollment.id)
        }
      } else {
        await supabase.from('enrollments').insert({
          user_id: params.userId,
          course_id: params.courseId,
          status: 'actif',
          validated_by: adminId,
          validated_at: now,
        })
      }

      await supabase.from('admin_logs').insert({
        admin_id: adminId,
        action: 'cash_payment_recorded',
        target_table: 'payments',
        target_id: payment.id,
        details: { course_id: params.courseId, user_id: params.userId, amount_fcfa: params.amountFcfa },
      })

      return payment
    },
    onSuccess: () => {
      toast.success('Paiement enregistré et inscription activée')
      void queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement"),
  })

  const validatePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!adminId) throw new Error('Non authentifié')
      const { error } = await supabase
        .from('payments')
        .update({ status: 'valide', validated_by: adminId, validated_at: new Date().toISOString() })
        .eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Paiement validé')
      void queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
    },
    onError: () => toast.error('Erreur lors de la validation'),
  })

  return {
    payments: paymentsQuery.data ?? [],
    isLoading: paymentsQuery.isLoading,
    recordCashPayment,
    validatePayment,
  }
}
