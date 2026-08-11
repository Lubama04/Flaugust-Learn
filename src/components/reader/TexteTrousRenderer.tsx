import { Input } from '@/components/ui/input'
import type { TexteTrousQuestion } from '@/components/studio/TexteTrousBuilder'

interface TexteTrousRendererProps {
  questions: TexteTrousQuestion[]
  answers: Record<string, string[]>
  onChange: (questionId: string, blankIndex: number, value: string) => void
  disabled?: boolean
}

export function TexteTrousRenderer({ questions, answers, onChange, disabled }: TexteTrousRendererProps) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => {
        const parts = q.text.split('___')
        const current = answers[q.id] ?? []
        return (
          <div key={q.id}>
            <p className="font-medium text-dark">Phrase {i + 1}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-dark">
              {parts.map((part, idx) => (
                <span key={idx} className="flex items-center gap-2">
                  {part}
                  {idx < parts.length - 1 && (
                    <Input
                      className="inline-block h-8 w-32"
                      value={current[idx] ?? ''}
                      disabled={disabled}
                      onChange={(e) => onChange(q.id, idx, e.target.value)}
                    />
                  )}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
