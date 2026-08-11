import { useQuery } from '@tanstack/react-query'
import { Download, ExternalLink, FolderOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ResourceCard } from '@/components/resources/ResourceCard'
import type { CourseResource } from '@/types'

async function fetchDownloadableResources(courseId: string): Promise<CourseResource[]> {
  const { data, error } = await supabase
    .from('course_resources')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_downloadable', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

interface DownloadableResourcesProps {
  courseId: string
  enrollmentId: string
}

/** Liste des ressources téléchargeables d'une formation, visible par les inscrits actifs. */
export function DownloadableResources({ courseId, enrollmentId }: DownloadableResourcesProps) {
  const toast = useToast()
  const { data: resources, isLoading } = useQuery({
    queryKey: ['downloadable-resources', courseId],
    queryFn: () => fetchDownloadableResources(courseId),
  })

  const handleDownload = async (resource: CourseResource) => {
    if (resource.file_type === 'lien') {
      window.open(resource.file_url, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const { data, error } = await supabase.functions.invoke<{ signedUrl?: string; error?: string }>(
        'get-signed-url',
        { body: { bucket: 'course-resources', path: resource.file_url, enrollment_id: enrollmentId } }
      )
      if (error) throw error
      if (!data?.signedUrl) throw new Error(data?.error ?? "Impossible d'obtenir le fichier")
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement')
    }
  }

  if (isLoading) return <LoadingSpinner label="Chargement des ressources…" />
  if (!resources || resources.length === 0) {
    return <EmptyState icon={FolderOpen} title="Aucune ressource disponible" description="Le formateur n'a pas encore ajouté de document téléchargeable." />
  }

  return (
    <div className="space-y-2">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          actions={
            <Button variant="outline" size="sm" onClick={() => void handleDownload(resource)}>
              {resource.file_type === 'lien' ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            </Button>
          }
        />
      ))}
    </div>
  )
}
