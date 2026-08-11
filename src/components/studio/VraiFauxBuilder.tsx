import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export interface VraiFauxQuestion {
  id: string
  prompt: string
  correct: boolean
  justification?: string
}

interface VraiFauxBuilderProps {
  questions: VraiFauxQuestion[]
  onChange: (questions: VraiFauxQuestion[]) => void
}

export function VraiFauxBuilder({ questions, onChange }: VraiFauxBuilderProps) {
  const addQuestion = () => {
    onChange([...questions, { id: crypto.randomUUID(), prompt: '', correct: true, justification: '' }])
  }

  const updateQuestion = (id: string, patch: Partial<VraiFauxQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (id: string) => onChange(questions.filter((q) => q.id !== id))

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-start gap-2">
              <Input
                placeholder={`Affirmation ${i + 1}`}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
              />
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            <div className="flex items-center gap-4 pl-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`vf-${q.id}`}
                  checked={q.correct}
                  onChange={() => updateQuestion(q.id, { correct: true })}
                />
                Vrai
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`vf-${q.id}`}
                  checked={!q.correct}
                  onChange={() => updateQuestion(q.id, { correct: false })}
                />
                Faux
              </label>
            </div>
            <Input
              placeholder="Justification (optionnelle, affichée après réponse)"
              value={q.justification ?? ''}
              onChange={(e) => updateQuestion(q.id, { justification: e.target.value })}
            />
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addQuestion}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter une affirmation
      </Button>
    </div>
  )
}
