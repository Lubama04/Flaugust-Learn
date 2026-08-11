import { Textarea } from '@/components/ui/textarea'
import type { ReponseCourteQuestion } from '@/components/studio/ReponseCourteBuilder'

interface ReponseCourteRendererProps {
  questions: ReponseCourteQuestion[]
  answers: Record<string, string>
  onChange: (questionId: string, value: string) => void
  disabled?: boolean
}

export function ReponseCourteRenderer({ questions, answers, onChange, disabled }: ReponseCourteRendererProps) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id}>
          <p className="font-medium text-dark">
            {i + 1}. {q.prompt}
          </p>
          <Textarea
            className="mt-2"
            rows={3}
            value={answers[q.id] ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(q.id, e.target.value)}
            placeholder="Votre réponse…"
          />
        </div>
      ))}
    </div>
  )
}
