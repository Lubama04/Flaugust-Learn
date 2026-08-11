import { useQuery } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { CertificateCard } from '@/components/certificate/CertificateCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

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
            <CertificateCard key={c.id} certificate={c} />
          ))}
        </div>
      )}
    </div>
  )
}
