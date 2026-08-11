import { cn } from '@/lib/utils'
import type { QcmQuestion } from '@/components/studio/QcmBuilder'

interface QcmRendererProps {
  questions: QcmQuestion[]
  answers: Record<string, string[]>
  onChange: (questionId: string, optionIds: string[]) => void
  disabled?: boolean
}

export function QcmRenderer({ questions, answers, onChange, disabled }: QcmRendererProps) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => {
        const selected = answers[q.id] ?? []
        return (
          <div key={q.id}>
            <p className="font-medium text-dark">
              {i + 1}. {q.prompt}
            </p>
            <div className="mt-2 space-y-2">
              {q.options.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm',
                    selected.includes(opt.id) && 'border-primary bg-primary/5'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.id)}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, opt.id]
                        : selected.filter((id) => id !== opt.id)
                      onChange(q.id, next)
                    }}
                  />
                  {opt.text}
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
