import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SectionTransitionCardProps {
  title: string
  estimatedMinutes: number
  onStart: () => void
}

/** Écran de transition affiché avant chaque nouvelle grande section (h2) d'une session. */
export function SectionTransitionCard({ title, estimatedMinutes, onStart }: SectionTransitionCardProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-xl bg-white p-8 text-center shadow-sm">
      <BookOpen className="h-10 w-10 text-primary" aria-hidden="true" />
      <h2 className="text-xl font-bold text-primary sm:text-2xl">{title}</h2>
      <p className="text-sm text-gray-400">Durée estimée : {estimatedMinutes} minute{estimatedMinutes > 1 ? 's' : ''}</p>
      <Button size="lg" onClick={onStart} className="mt-2">
        Commencer →
      </Button>
    </div>
  )
}
