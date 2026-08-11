import { cn } from '@/lib/utils'
import type { VraiFauxQuestion } from '@/components/studio/VraiFauxBuilder'

interface VraiFauxRendererProps {
  questions: VraiFauxQuestion[]
  answers: Record<string, boolean>
  onChange: (questionId: string, value: boolean) => void
  disabled?: boolean
}

export function VraiFauxRenderer({ questions, answers, onChange, disabled }: VraiFauxRendererProps) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id}>
          <p className="font-medium text-dark">
            {i + 1}. {q.prompt}
          </p>
          <div className="mt-2 flex gap-3">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                disabled={disabled}
                onClick={() => onChange(q.id, value)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-medium',
                  answers[q.id] === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray hover:border-gray-300'
                )}
              >
                {value ? 'Vrai' : 'Faux'}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
