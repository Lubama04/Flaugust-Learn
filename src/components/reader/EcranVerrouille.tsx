import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { SessionAccessResult } from '@/hooks/useSessionAccess'

interface EcranVerrouilleProps {
  access: SessionAccessResult
  onGoToPreviousSession: (sessionId: string) => void
}

export function EcranVerrouille({ access, onGoToPreviousSession }: EcranVerrouilleProps) {
  const message =
    access.reason === 'exercise_not_passed'
      ? "Vous devez d'abord réussir l'exercice de validation de la session précédente."
      : access.reason === 'session_not_completed'
        ? 'Vous devez terminer la session précédente avant de continuer.'
        : "Cette session n'est pas encore accessible."

  return (
    <Card className="mx-auto max-w-lg bg-lightGray/60">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <Lock className="h-14 w-14 text-gray-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-dark">Session verrouillée</h2>
        <p className="max-w-sm text-sm text-gray">{message}</p>
        {access.previous_session_id && (
          <Button variant="outline" onClick={() => onGoToPreviousSession(access.previous_session_id!)}>
            ← Retourner à l'exercice
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
