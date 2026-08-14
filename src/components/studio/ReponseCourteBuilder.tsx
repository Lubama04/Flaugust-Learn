import { Plus, Trash2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

export interface ReponseCourteQuestion {
  id: string
  prompt: string
  model_answer: string
}

interface ReponseCourteBuilderProps {
  questions: ReponseCourteQuestion[]
  onChange: (questions: ReponseCourteQuestion[]) => void
}

export function ReponseCourteBuilder({ questions, onChange }: ReponseCourteBuilderProps) {
  const addQuestion = () => {
    onChange([...questions, { id: crypto.randomUUID(), prompt: '', model_answer: '' }])
  }

  const updateQuestion = (id: string, patch: Partial<ReponseCourteQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (id: string) => onChange(questions.filter((q) => q.id !== id))

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-xs text-accent">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Les réponses courtes ne sont pas corrigées automatiquement, elles nécessitent une
        relecture manuelle (fonctionnalité à venir).
      </div>
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
            <Textarea
              placeholder="Réponse modèle (repère pour la correction manuelle)"
              value={q.model_answer}
              onChange={(e) => updateQuestion(q.id, { model_answer: e.target.value })}
              rows={2}
            />
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addQuestion}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter une question
      </Button>
    </div>
  )
}
