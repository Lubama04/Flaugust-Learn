import { cn } from '@/lib/utils'

const STYLES: Record<string, string> = {
  obligatoire: 'border border-red-200 bg-red-100 text-red-700',
  recommande: 'border border-yellow-200 bg-yellow-100 text-yellow-700',
  facultatif: 'border border-gray-200 bg-gray-100 text-gray-500',
}

const LABELS: Record<string, string> = {
  obligatoire: '🔴 Obligatoire',
  recommande: '🟡 Recommandé',
  facultatif: 'Facultatif',
}

export function ObligationBadge({ level, className }: { level: string; className?: string }) {
  return (
    <span className={cn('rounded-full px-2 py-1 text-xs font-medium', STYLES[level] ?? STYLES.facultatif, className)}>
      {LABELS[level] ?? 'Facultatif'}
    </span>
  )
}
