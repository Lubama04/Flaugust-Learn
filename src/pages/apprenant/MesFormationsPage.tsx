import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente de validation',
  actif: 'Actif',
  complete: 'Terminée',
  suspendu: 'Suspendue',
}

async function fetchMyEnrollments(userId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, courses(title, level, duration_hours)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function MesFormationsPage() {
  const userId = useAuthStore((s) => s.session?.user.id)

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments-all', userId],
    queryFn: () => fetchMyEnrollments(userId!),
    enabled: !!userId,
  })

  if (isLoading) return <LoadingSpinner label="Chargement…" />

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-dark">Mes formations</h1>
      {!enrollments || enrollments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Vous n'êtes inscrit à aucune formation"
          description="Parcourez le catalogue pour trouver votre prochaine formation."
        />
      ) : (
        <div className="space-y-4">
          {enrollments.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-medium text-dark">
                    {(e as { courses?: { title?: string } }).courses?.title}
                  </p>
                  <p className="text-sm text-gray">Progression : {e.progress_pct}%</p>
                </div>
                <Badge variant={e.status === 'actif' ? 'secondary' : 'gray'}>
                  {STATUS_LABELS[e.status] ?? e.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
