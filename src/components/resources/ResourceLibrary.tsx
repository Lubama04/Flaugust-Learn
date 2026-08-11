import { useState } from 'react'
import { Plus, Sparkles, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useResourceLibrary } from '@/hooks/useResourceLibrary'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ResourceCard } from '@/components/resources/ResourceCard'
import { ResourceUpload } from '@/components/resources/ResourceUpload'
import { FolderOpen } from 'lucide-react'

interface ResourceLibraryProps {
  courseId: string
}

/** Bibliothèque de ressources du formateur : ajout, indexation IA, visibilité, suppression. */
export function ResourceLibrary({ courseId }: ResourceLibraryProps) {
  const userId = useAuthStore((s) => s.session?.user.id)
  const [uploadOpen, setUploadOpen] = useState(false)
  const { resources, isLoading, uploadResource, addLinkResource, deleteResource, toggleDownloadable, triggerIndex } =
    useResourceLibrary(courseId)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray">
          Les ressources indexées par l'IA enrichissent les réponses de l'assistant dans la discussion de la formation.
        </p>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Ajouter
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement…" />
      ) : resources.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Aucune ressource" description="Ajoutez des documents ou liens pour enrichir cette formation." />
      ) : (
        <div className="space-y-2">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              actions={
                <>
                  {resource.indexing_status !== 'indexe' && resource.indexing_status !== 'en_cours' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Indexer avec l'IA"
                      onClick={() => triggerIndex.mutate(resource.id)}
                      disabled={triggerIndex.isPending}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title={resource.is_downloadable ? 'Rendre non téléchargeable' : 'Rendre téléchargeable'}
                    onClick={() => toggleDownloadable.mutate({ id: resource.id, isDownloadable: !resource.is_downloadable })}
                  >
                    {resource.is_downloadable ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Supprimer"
                    onClick={() => deleteResource.mutate(resource)}
                    disabled={deleteResource.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <ResourceUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        isSubmitting={uploadResource.isPending || addLinkResource.isPending}
        onUploadFile={(params) => uploadResource.mutateAsync({ ...params, formateurId: userId! })}
        onAddLink={(params) => addLinkResource.mutateAsync({ ...params, formateurId: userId! })}
      />
    </div>
  )
}
