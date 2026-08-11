import { QcmRenderer } from '@/components/reader/QcmRenderer'
import { VraiFauxRenderer } from '@/components/reader/VraiFauxRenderer'
import { TexteTrousRenderer } from '@/components/reader/TexteTrousRenderer'
import { AssociationRenderer } from '@/components/reader/AssociationRenderer'
import { ReponseCourteRenderer } from '@/components/reader/ReponseCourteRenderer'
import type { QcmQuestion } from '@/components/studio/QcmBuilder'
import type { VraiFauxQuestion } from '@/components/studio/VraiFauxBuilder'
import type { TexteTrousQuestion } from '@/components/studio/TexteTrousBuilder'
import type { AssociationQuestion } from '@/components/studio/AssociationBuilder'
import type { ReponseCourteQuestion } from '@/components/studio/ReponseCourteBuilder'
import type { Exercise } from '@/types'

interface ExerciseRendererProps {
  exercise: Exercise
  answers: Record<string, unknown>
  onAnswerChange: (questionId: string, value: unknown) => void
  disabled?: boolean
}

/** Dispatche vers le renderer adapté au type d'exercice et normalise le format des réponses. */
export function ExerciseRenderer({ exercise, answers, onAnswerChange, disabled }: ExerciseRendererProps) {
  switch (exercise.type) {
    case 'qcm':
      return (
        <QcmRenderer
          questions={exercise.questions as unknown as QcmQuestion[]}
          answers={answers as Record<string, string[]>}
          onChange={(id, value) => onAnswerChange(id, value)}
          disabled={disabled}
        />
      )
    case 'vrai_faux':
      return (
        <VraiFauxRenderer
          questions={exercise.questions as unknown as VraiFauxQuestion[]}
          answers={answers as Record<string, boolean>}
          onChange={(id, value) => onAnswerChange(id, value)}
          disabled={disabled}
        />
      )
    case 'texte_a_trous':
      return (
        <TexteTrousRenderer
          questions={exercise.questions as unknown as TexteTrousQuestion[]}
          answers={answers as Record<string, string[]>}
          onChange={(id, blankIndex, value) => {
            const current = [...((answers[id] as string[] | undefined) ?? [])]
            current[blankIndex] = value
            onAnswerChange(id, current)
          }}
          disabled={disabled}
        />
      )
    case 'association':
      return (
        <AssociationRenderer
          questions={exercise.questions as unknown as AssociationQuestion[]}
          answers={answers as Record<string, Record<string, string>>}
          onChange={(id, left, right) => {
            const current = { ...((answers[id] as Record<string, string> | undefined) ?? {}) }
            current[left] = right
            onAnswerChange(id, current)
          }}
          disabled={disabled}
        />
      )
    case 'reponse_courte':
      return (
        <ReponseCourteRenderer
          questions={exercise.questions as unknown as ReponseCourteQuestion[]}
          answers={answers as Record<string, string>}
          onChange={(id, value) => onAnswerChange(id, value)}
          disabled={disabled}
        />
      )
    default:
      return <p className="text-sm text-gray">Ce type d'exercice n'est pas encore pris en charge.</p>
  }
}
