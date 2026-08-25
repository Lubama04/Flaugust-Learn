import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoursePlanOverlayProps {
  open: boolean
  onClose: () => void
  progressPct: number
  children: ReactNode
}

/**
 * Overlay plein écran (pas une sidebar fixe) présentant le plan de la formation : glissement
 * depuis la gauche, fond sombre 50% derrière, fermeture au clic sur le fond ou sur ✕.
 */
export function CoursePlanOverlay({ open, onClose, progressPct, children }: CoursePlanOverlayProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Fermer le plan"
        onClick={onClose}
        className="absolute inset-0 animate-in fade-in bg-black/50 duration-300"
      />
      <div
        className={cn(
          'relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-xl',
          'animate-in slide-in-from-left duration-300'
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="flex items-center gap-2 text-base font-semibold text-dark">
            <BookOpen className="h-5 w-5 text-primary" /> Plan de la formation
          </p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-dark">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
            <span>Progression</span>
            <span className="font-medium text-dark">{progressPct}% complété</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-secondary transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
