import type { ReactNode } from 'react'
import { BookOpen } from 'lucide-react'

interface CourseReaderProps {
  title: string
  sessionTitle?: string
  progressPct: number
  onOpenPlan: () => void
  audioButton?: ReactNode
  children: ReactNode
  headerAction?: ReactNode
}

/**
 * Coquille du lecteur : en-tête avec bouton Plan (ouvre l'overlay) et barre de progression fine,
 * contenu centré (max-width 720px) sur fond légèrement gris. Le plan de formation, la fiche
 * interactive et le chat/assistant vivent désormais en overlays plutôt que dans des colonnes
 * fixes, donc plus de mise en page 3 colonnes ici.
 */
export function CourseReader({ title, sessionTitle, progressPct, onOpenPlan, audioButton, children, headerAction }: CourseReaderProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            type="button"
            onClick={onOpenPlan}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Plan</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-dark">{sessionTitle ?? title}</p>
            {sessionTitle && <p className="truncate text-xs text-gray-400">{title}</p>}
          </div>
          {audioButton}
          {headerAction}
        </div>
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-secondary transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="shrink-0 text-xs font-medium text-gray-400">{progressPct}%</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
