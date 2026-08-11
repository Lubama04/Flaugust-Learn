import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

export interface TexteTrousQuestion {
  id: string
  text: string
  answers: string[]
}

interface TexteTrousBuilderProps {
  questions: TexteTrousQuestion[]
  onChange: (questions: TexteTrousQuestion[]) => void
}

function countBlanks(text: string): number {
  return (text.match(/___/g) ?? []).length
}

export function TexteTrousBuilder({ questions, onChange }: TexteTrousBuilderProps) {
  const addQuestion = () => {
    onChange([...questions, { id: crypto.randomUUID(), text: '', answers: [] }])
  }

  const updateText = (id: string, text: string) => {
    const blanks = countBlanks(text)
    onChange(
      questions.map((q) => {
        if (q.id !== id) return q
        const answers = [...q.answers]
        answers.length = blanks
        return { ...q, text, answers: answers.map((a) => a ?? '') }
      })
    )
  }

  const updateAnswer = (id: string, index: number, value: string) => {
    onChange(
      questions.map((q) => {
        if (q.id !== id) return q
        const answers = [...q.answers]
        answers[index] = value
        return { ...q, answers }
      })
    )
  }

  const removeQuestion = (id: string) => onChange(questions.filter((q) => q.id !== id))

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-start gap-2">
              <Textarea
                placeholder={`Phrase ${i + 1} — utilisez ___ pour chaque trou à compléter`}
                value={q.text}
                onChange={(e) => updateText(q.id, e.target.value)}
                rows={2}
              />
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            {q.answers.length > 0 && (
              <div className="space-y-2 pl-4">
                <p className="text-xs text-gray-400">Réponses attendues, dans l'ordre des trous :</p>
                {q.answers.map((answer, idx) => (
                  <Input
                    key={idx}
                    placeholder={`Réponse trou ${idx + 1}`}
                    value={answer}
                    onChange={(e) => updateAnswer(q.id, idx, e.target.value)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addQuestion}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter une phrase à trous
      </Button>
    </div>
  )
}
