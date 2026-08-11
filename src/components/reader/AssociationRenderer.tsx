import { useMemo } from 'react'
import type { AssociationQuestion } from '@/components/studio/AssociationBuilder'

interface AssociationRendererProps {
  questions: AssociationQuestion[]
  answers: Record<string, Record<string, string>>
  onChange: (questionId: string, left: string, right: string) => void
  disabled?: boolean
}

export function AssociationRenderer({ questions, answers, onChange, disabled }: AssociationRendererProps) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => {
        const current = answers[q.id] ?? {}
        return <AssociationQuestionRow key={q.id} index={i} question={q} current={current} onChange={onChange} disabled={disabled} />
      })}
    </div>
  )
}

function AssociationQuestionRow({
  index,
  question,
  current,
  onChange,
  disabled,
}: {
  index: number
  question: AssociationQuestion
  current: Record<string, string>
  onChange: (questionId: string, left: string, right: string) => void
  disabled?: boolean
}) {
  const shuffledRights = useMemo(
    () => [...question.pairs.map((p) => p.right)].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id]
  )

  return (
    <div>
      <p className="font-medium text-dark">
        {index + 1}. {question.prompt}
      </p>
      <div className="mt-2 space-y-2">
        {question.pairs.map((pair) => (
          <div key={pair.left} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 text-dark">{pair.left}</span>
            <select
              value={current[pair.left] ?? ''}
              disabled={disabled}
              onChange={(e) => onChange(question.id, pair.left, e.target.value)}
              className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-2 text-sm text-dark"
            >
              <option value="">— Choisir —</option>
              {shuffledRights.map((right) => (
                <option key={right} value={right}>
                  {right}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
