import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExerciseRenderer } from '@/components/reader/ExerciseRenderer'
import { useExercise } from '@/hooks/useExercise'
import { useToast } from '@/hooks/useToast'
import type { Exercise } from '@/types'

interface ExerciseModalProps {
  exercise: Exercise
  enrollmentId: string
  open: boolean
  onClose: () => void
  onPassed: () => void
}

export function ExerciseModal({ exercise, enrollmentId, open, onClose, onPassed }: ExerciseModalProps) {
  const toast = useToast()
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [startedAt] = useState(() => Date.now())
  const { mutate, isPending, data: result, reset } = useExercise()

  const handleClose = () => {
    setAnswers({})
    reset()
    onClose()
  }

  const handleSubmit = () => {
    mutate(
      {
        exerciseId: exercise.id,
        enrollmentId,
        answers,
        timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
      },
      {
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Erreur lors de l'envoi"
          toast.error(message)
        },
      }
    )
  }

  const questionCount = Array.isArray(exercise.questions) ? exercise.questions.length : 0
  const answeredCount = Object.keys(answers).length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{exercise.title}</DialogTitle>
          {exercise.instructions && <DialogDescription>{exercise.instructions}</DialogDescription>}
        </DialogHeader>

        {result ? (
          <div className="space-y-4 text-center">
            {result.passed ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-lime" />
            ) : (
              <XCircle className="mx-auto h-12 w-12 text-red-400" />
            )}
            <p className="text-2xl font-bold text-dark">{result.score}%</p>
            <p className="text-sm text-gray">
              {result.passed
                ? 'Bravo, vous avez validé cette étape !'
                : `Score insuffisant (minimum requis : ${exercise.pass_score}%). Tentatives restantes : ${result.attempts_remaining}.`}
            </p>
            <div className="flex justify-center gap-2">
              {result.passed ? (
                <Button
                  onClick={() => {
                    onPassed()
                    handleClose()
                  }}
                >
                  Continuer
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    Fermer
                  </Button>
                  {result.attempts_remaining > 0 && (
                    <Button
                      onClick={() => {
                        setAnswers({})
                        reset()
                      }}
                    >
                      Réessayer
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ExerciseRenderer
              exercise={exercise}
              answers={answers}
              onAnswerChange={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
              disabled={isPending}
            />
            <p className="text-xs text-gray-400">
              {answeredCount} / {questionCount} question(s) répondue(s)
            </p>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isPending || answeredCount === 0}>
                {isPending ? 'Envoi…' : 'Valider mes réponses'}
              </Button>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
