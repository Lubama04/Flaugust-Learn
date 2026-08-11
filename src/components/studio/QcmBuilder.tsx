import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export interface QcmOption {
  id: string
  text: string
  correct: boolean
}
export interface QcmQuestion {
  id: string
  prompt: string
  options: QcmOption[]
}

interface QcmBuilderProps {
  questions: QcmQuestion[]
  onChange: (questions: QcmQuestion[]) => void
}

export function QcmBuilder({ questions, onChange }: QcmBuilderProps) {
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        id: crypto.randomUUID(),
        prompt: '',
        options: [
          { id: crypto.randomUUID(), text: '', correct: true },
          { id: crypto.randomUUID(), text: '', correct: false },
        ],
      },
    ])
  }

  const updateQuestion = (id: string, patch: Partial<QcmQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (id: string) => onChange(questions.filter((q) => q.id !== id))

  const updateOption = (questionId: string, optionId: string, patch: Partial<QcmOption>) => {
    onChange(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)) }
          : q
      )
    )
  }

  const addOption = (questionId: string) => {
    onChange(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, { id: crypto.randomUUID(), text: '', correct: false }] }
          : q
      )
    )
  }

  const removeOption = (questionId: string, optionId: string) => {
    onChange(
      questions.map((q) =>
        q.id === questionId ? { ...q, options: q.options.filter((o) => o.id !== optionId) } : q
      )
    )
  }

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-start gap-2">
              <Input
                placeholder={`Question ${i + 1}`}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
              />
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            <div className="space-y-2 pl-4">
              {q.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opt.correct}
                    onChange={(e) => updateOption(q.id, opt.id, { correct: e.target.checked })}
                    className="h-4 w-4"
                    title="Bonne réponse"
                  />
                  <Input
                    placeholder="Option de réponse"
                    value={opt.text}
                    onChange={(e) => updateOption(q.id, opt.id, { text: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeOption(q.id, opt.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addOption(q.id)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Option
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addQuestion}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter une question
      </Button>
    </div>
  )
}
