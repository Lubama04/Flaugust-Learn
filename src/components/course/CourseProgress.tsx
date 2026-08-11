import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface CourseProgressProps {
  progressPct: number
  className?: string
  showLabel?: boolean
}

export function CourseProgress({ progressPct, className, showLabel = true }: CourseProgressProps) {
  const pct = Math.max(0, Math.min(100, progressPct))
  return (
    <div className={cn('space-y-1', className)}>
      <Progress value={pct} />
      {showLabel && <p className="text-xs text-gray">{pct}% complété</p>}
    </div>
  )
}
