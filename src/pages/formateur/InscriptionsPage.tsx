import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, ClipboardCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'

interface PendingEnrollment {
  id: string
  created_at: string
  profiles: { full_name: string } | null
  courses: { title: string; formateur_id: string } | null
}

async function fetchPendingEnrollments(formateurId: string): Promise<PendingEnrollment[]> {
  // enrollments a deux FK vers profiles (user_id ET validated_by) : sans préciser laquelle,
  // PostgREST renvoie une erreur d'embed ambigu (PGRST201) — la requête échouait silencieusement
  // côté UI (catch → liste vide affichée comme "aucune inscription en attente").
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, created_at, profiles:profiles!enrollments_user_id_fkey(full_name), courses!inner(title, formateur_id)')
    .eq('status', 'en_attente')
    .eq('courses.formateur_id', formateurId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as unknown as PendingEnrollment[]
}

export function InscriptionsPage() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['pending-enrollments', userId],
    queryFn: () => fetchPendingEnrollments(userId!),
    enabled: !!userId,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'actif' | 'suspendu' }) => {
      const { error } = await supabase
        .from('enrollments')
        .update({ status, validated_by: userId, validated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      // L'email de confirmation ne doit jamais faire échouer la validation elle-même —
      // l'inscription est déjà passée à 'actif' au moment de cet appel.
      if (status === 'actif') {
        try {
          await supabase.functions.invoke('notify-enrollment-validated', { body: { enrollment_id: id } })
        } catch {
          // best-effort
        }
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] })
      toast.success(variables.status === 'actif' ? 'Inscription validée — email envoyé à l\'apprenant' : 'Inscription mise à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark">Inscriptions en attente</h1>

      <div className="flex items-start gap-3 rounded-lg bg-accent/10 p-4 text-sm text-accent">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Vous pouvez valider manuellement les inscriptions, y compris pour les paiements en
        espèces.
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement…" />
      ) : !enrollments || enrollments.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucune inscription en attente" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Apprenant</th>
                  <th className="px-6 py-3 font-medium">Formation</th>
                  <th className="px-6 py-3 font-medium">Date demande</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3">{e.profiles?.full_name ?? '—'}</td>
                    <td className="px-6 py-3">{e.courses?.title ?? '—'}</td>
                    <td className="px-6 py-3 text-gray">{formatDate(e.created_at)}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: e.id, status: 'actif' })}
                          disabled={updateStatus.isPending}
                        >
                          Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: e.id, status: 'suspendu' })}
                          disabled={updateStatus.isPending}
                        >
                          Refuser
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
