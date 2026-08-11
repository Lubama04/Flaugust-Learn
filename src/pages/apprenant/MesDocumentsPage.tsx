import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileStack, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ExportModal } from '@/components/export/ExportModal'

async function fetchMyEnrollmentsWithCourses(userId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, status, courses(title)')
    .eq('user_id', userId)
    .in('status', ['actif', 'complete'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function MesDocumentsPage() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const [exportTarget, setExportTarget] = useState<{ enrollmentId: string; courseTitle: string } | null>(null)

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-documents', userId],
    queryFn: () => fetchMyEnrollmentsWithCourses(userId!),
    enabled: !!userId,
  })

  if (isLoading) return <LoadingSpinner label="Chargement…" />

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-dark">Mes documents</h1>
      <p className="mb-6 text-sm text-gray">
        Exportez le détail de vos évaluations pour chaque formation suivie.
      </p>

      {!enrollments || enrollments.length === 0 ? (
        <EmptyState icon={FileStack} title="Aucun document disponible" description="Inscrivez-vous à une formation pour commencer." />
      ) : (
        <div className="space-y-3">
          {enrollments.map((e) => {
            const courseTitle = (e as unknown as { courses?: { title?: string } }).courses?.title ?? '—'
            return (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div className="flex items-center gap-3">
                    <FileStack className="h-5 w-5 text-primary" />
                    <p className="font-medium text-dark">{courseTitle}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setExportTarget({ enrollmentId: e.id, courseTitle })}>
                    <Download className="mr-2 h-4 w-4" /> Exporter mes évaluations
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {exportTarget && (
        <ExportModal
          enrollmentId={exportTarget.enrollmentId}
          courseTitle={exportTarget.courseTitle}
          open={!!exportTarget}
          onClose={() => setExportTarget(null)}
        />
      )}
    </div>
  )
}
