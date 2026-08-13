import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
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
  complete: 'Terminée ✅',
  suspendu: 'Suspendue',
}

async function fetchMyEnrollments(userId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, courses(title, slug, level, duration_hours)')
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
          {enrollments.map((e) => {
            const course = (e as { courses?: { title?: string; slug?: string } }).courses
            const isClickable = (e.status === 'actif' || e.status === 'complete') && !!course?.slug
            const badge = (
              <Badge variant={e.status === 'actif' ? 'secondary' : e.status === 'complete' ? 'lime' : 'gray'}>
                {STATUS_LABELS[e.status] ?? e.status}
              </Badge>
            )
            const content = (
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-medium text-dark">{course?.title}</p>
                  <p className="text-sm text-gray">Progression : {e.progress_pct}%</p>
                </div>
                {badge}
              </CardContent>
            )
            return isClickable ? (
              <Link key={e.id} to="/formation/$slug/apprendre" params={{ slug: course!.slug! }} className="block">
                <Card className="transition-shadow hover:shadow-md">{content}</Card>
              </Link>
            ) : (
              <Card key={e.id}>{content}</Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
