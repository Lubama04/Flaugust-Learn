import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { courseEditRoute } from '@/router'
import { CourseForm } from '@/components/studio/CourseForm'
import { ModuleBuilder } from '@/components/studio/ModuleBuilder'
import { ExerciseBuilder } from '@/components/studio/ExerciseBuilder'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { CourseStatus } from '@/types'
import type { TablesUpdate } from '@/types/database'

const STATUS_LABELS: Record<CourseStatus, string> = {
  brouillon: 'Brouillon',
  en_revision: 'En révision',
  publie: 'Publié',
  archive: 'Archivé',
}

async function fetchCourse(courseId: string) {
  const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single()
  if (error) throw error
  return data
}

async function fetchContentCounts(courseId: string) {
  const { data: modules, error } = await supabase
    .from('modules')
    .select('id, sessions(id)')
    .eq('course_id', courseId)
  if (error) throw error
  const sessionCount = modules.reduce((sum, m) => sum + (m.sessions?.length ?? 0), 0)
  return { moduleCount: modules.length, sessionCount }
}

export function CourseEditPage() {
  const { courseId } = courseEditRoute.useParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-edit', courseId],
    queryFn: () => fetchCourse(courseId),
  })

  const { data: counts } = useQuery({
    queryKey: ['course-content-counts', courseId],
    queryFn: () => fetchContentCounts(courseId),
  })

  const updateStatus = useMutation({
    mutationFn: async (status: CourseStatus) => {
      const patch: TablesUpdate<'courses'> = { status }
      if (status === 'publie') patch.published_at = new Date().toISOString()
      const { error } = await supabase.from('courses').update(patch).eq('id', courseId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Statut mis à jour')
      void queryClient.invalidateQueries({ queryKey: ['course-edit', courseId] })
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  })

  if (isLoading || !course) return <LoadingSpinner label="Chargement de la formation…" />

  const canPublish = (counts?.moduleCount ?? 0) > 0 && (counts?.sessionCount ?? 0) > 0

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-dark">{course.title}</h1>
        <Badge variant={course.status === 'publie' ? 'secondary' : 'gray'}>
          {STATUS_LABELS[course.status]}
        </Badge>
      </div>

      <Tabs defaultValue="contenu">
        <TabsList>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="contenu">Contenu</TabsTrigger>
          <TabsTrigger value="examen">Examen final</TabsTrigger>
          <TabsTrigger value="publication">Publication</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <CourseForm course={course} onSaved={() => void queryClient.invalidateQueries({ queryKey: ['course-edit', courseId] })} />
        </TabsContent>

        <TabsContent value="contenu">
          <ModuleBuilder courseId={courseId} />
        </TabsContent>

        <TabsContent value="examen">
          <p className="mb-4 text-sm text-gray">
            L'examen final est proposé après la dernière session de la formation, pour valider
            l'ensemble des acquis.
          </p>
          <ExerciseBuilder
            sessionId={undefined}
            courseId={courseId}
            onSaved={() => void queryClient.invalidateQueries({ queryKey: ['exercise'] })}
            onCancel={() => {}}
          />
        </TabsContent>

        <TabsContent value="publication">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {!canPublish && (
                <div className="flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-sm text-accent">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Ajoutez au moins un module avec une session avant de publier cette formation.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABELS) as CourseStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={course.status === status ? 'default' : 'outline'}
                    size="sm"
                    disabled={status === 'publie' && !canPublish}
                    onClick={() => updateStatus.mutate(status)}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
