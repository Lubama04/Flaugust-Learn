import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
      <Icon className="h-10 w-10 text-gray-300" aria-hidden="true" />
      <p className="font-medium text-dark">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray">{description}</p>}
    </div>
  )
}
