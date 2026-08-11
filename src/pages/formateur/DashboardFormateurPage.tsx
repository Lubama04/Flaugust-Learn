import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  en_revision: 'En révision',
  publie: 'Publié',
  archive: 'Archivé',
}

async function fetchMyCourses(formateurId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('formateur_id', formateurId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function DashboardFormateurPage() {
  const userId = useAuthStore((s) => s.session?.user.id)

  const { data: courses, isLoading } = useQuery({
    queryKey: ['my-courses', userId],
    queryFn: () => fetchMyCourses(userId!),
    enabled: !!userId,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">Mes formations</h1>
        <Link to="/formateur/formations/nouvelle">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Créer une formation
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement…" />
      ) : !courses || courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Vous n'avez créé aucune formation"
          description="Cliquez sur « Créer une formation » pour démarrer."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} to="/formateur/formations/$courseId/editer" params={{ courseId: course.id }}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-dark">{course.title}</p>
                    <Badge variant="gray">{STATUS_LABELS[course.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray">{course.enrolled_count} inscrit(s)</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Link to="/formateur/inscriptions" className="inline-block text-sm font-medium text-primary hover:underline">
        Voir les inscriptions en attente →
      </Link>
    </div>
  )
}
