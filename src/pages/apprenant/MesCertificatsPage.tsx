import { useQuery } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDate } from '@/lib/utils'

async function fetchMyCertificates(userId: string) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*, courses(title)')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return data
}

export function MesCertificatsPage() {
  const userId = useAuthStore((s) => s.session?.user.id)

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['my-certificates', userId],
    queryFn: () => fetchMyCertificates(userId!),
    enabled: !!userId,
  })

  if (isLoading) return <LoadingSpinner label="Chargement…" />

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-dark">Mes certificats</h1>
      {!certificates || certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Aucun certificat pour le moment"
          description="Terminez une formation avec succès pour obtenir votre certificat."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-start gap-4 pt-6">
                <Award className="h-8 w-8 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-medium text-dark">
                    {(c as { courses?: { title?: string } }).courses?.title}
                  </p>
                  <p className="text-sm text-gray">
                    Délivré le {formatDate(c.issued_at)} — Score {c.final_score}%
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
