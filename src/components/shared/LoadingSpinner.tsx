import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  label?: string
}

export function LoadingSpinner({ className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      {label && <p className="text-sm text-gray">{label}</p>}
    </div>
  )
}
