import type { ReactNode } from 'react'
import { FileText, Link as LinkIcon, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CourseResource } from '@/types'

const INDEXING_LABELS: Record<string, { label: string; variant: 'gray' | 'accent' | 'secondary' | 'default' }> = {
  non_indexe: { label: 'Non indexé', variant: 'gray' },
  en_cours: { label: 'Indexation…', variant: 'accent' },
  indexe: { label: 'Indexé IA', variant: 'secondary' },
  echec: { label: 'Échec indexation', variant: 'default' },
}

function formatSize(bytes: number): string {
  if (bytes === 0) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

interface ResourceCardProps {
  resource: CourseResource
  actions?: ReactNode
}

export function ResourceCard({ resource, actions }: ResourceCardProps) {
  const isLink = resource.file_type === 'lien'
  const indexing = INDEXING_LABELS[resource.indexing_status] ?? INDEXING_LABELS.non_indexe!

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
      <div className="mt-0.5 shrink-0 text-gray-400">
        {isLink ? <LinkIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-dark">{resource.title}</p>
        {resource.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{resource.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="gray">{isLink ? 'Lien externe' : resource.file_type.toUpperCase()}</Badge>
          {!isLink && resource.file_size_bytes > 0 && (
            <span className="text-xs text-gray-400">{formatSize(resource.file_size_bytes)}</span>
          )}
          <Badge variant={indexing.variant} className="flex items-center gap-1">
            {resource.indexing_status === 'en_cours' && <Loader2 className="h-3 w-3 animate-spin" />}
            {resource.indexing_status === 'indexe' && <Sparkles className="h-3 w-3" />}
            {resource.indexing_status === 'echec' && <AlertCircle className="h-3 w-3" />}
            {indexing.label}
          </Badge>
        </div>
        {resource.indexing_status === 'echec' && resource.indexing_error && (
          <p className="mt-1 text-xs text-red-500">{resource.indexing_error}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}
