import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export interface AssociationPair {
  left: string
  right: string
}
export interface AssociationQuestion {
  id: string
  prompt: string
  pairs: AssociationPair[]
}

interface AssociationBuilderProps {
  questions: AssociationQuestion[]
  onChange: (questions: AssociationQuestion[]) => void
}

export function AssociationBuilder({ questions, onChange }: AssociationBuilderProps) {
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        id: crypto.randomUUID(),
        prompt: '',
        pairs: [
          { left: '', right: '' },
          { left: '', right: '' },
        ],
      },
    ])
  }

  const updateQuestion = (id: string, patch: Partial<AssociationQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (id: string) => onChange(questions.filter((q) => q.id !== id))

  const updatePair = (questionId: string, index: number, patch: Partial<AssociationPair>) => {
    onChange(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, pairs: q.pairs.map((p, i) => (i === index ? { ...p, ...patch } : p)) }
          : q
      )
    )
  }

  const addPair = (questionId: string) => {
    onChange(
      questions.map((q) => (q.id === questionId ? { ...q, pairs: [...q.pairs, { left: '', right: '' }] } : q))
    )
  }

  const removePair = (questionId: string, index: number) => {
    onChange(
      questions.map((q) =>
        q.id === questionId ? { ...q, pairs: q.pairs.filter((_, i) => i !== index) } : q
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
                placeholder={`Consigne ${i + 1} (ex: Associez chaque terme à sa définition)`}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
              />
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            <div className="space-y-2 pl-4">
              {q.pairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Élément"
                    value={pair.left}
                    onChange={(e) => updatePair(q.id, idx, { left: e.target.value })}
                  />
                  <span className="text-gray-300">→</span>
                  <Input
                    placeholder="Correspondance"
                    value={pair.right}
                    onChange={(e) => updatePair(q.id, idx, { right: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removePair(q.id, idx)}>
                    <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addPair(q.id)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Paire
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addQuestion}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter une association
      </Button>
    </div>
  )
}
