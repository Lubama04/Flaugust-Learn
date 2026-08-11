import { useState } from 'react'
import { Sparkles, Plus } from 'lucide-react'
import { useAIAssistant } from '@/hooks/useAIAssistant'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import type { QcmQuestion } from '@/components/studio/QcmBuilder'

interface GeminiQuizOption {
  text: string
  correct: boolean
}
interface GeminiQuizQuestion {
  text: string
  options: GeminiQuizOption[]
  explanation?: string
}

interface QuizGeneratorProps {
  /** Absent en usage autonome (page dédiée) : le bouton d'insertion est alors masqué. */
  onInsert?: (questions: QcmQuestion[]) => void
  defaultContent?: string
}

export function QuizGenerator({ onInsert, defaultContent }: QuizGeneratorProps) {
  const { ask, isLoading } = useAIAssistant()
  const toast = useToast()
  const [content, setContent] = useState(defaultContent ?? '')
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState('intermédiaire')
  const [generated, setGenerated] = useState<GeminiQuizQuestion[]>([])

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast.error('Collez un contenu de session à partir duquel générer le quiz')
      return
    }
    try {
      const raw = await ask('generate_quiz', { content, num_questions: numQuestions, difficulty })
      const parsed = JSON.parse(raw) as { questions?: GeminiQuizQuestion[] }
      if (!parsed.questions || parsed.questions.length === 0) {
        toast.error("L'IA n'a retourné aucune question exploitable")
        return
      }
      setGenerated(parsed.questions)
    } catch {
      toast.error('Erreur lors de la génération du quiz')
    }
  }

  const handleInsert = () => {
    if (!onInsert) return
    const questions: QcmQuestion[] = generated.map((q) => ({
      id: crypto.randomUUID(),
      prompt: q.text,
      options: q.options.map((o) => ({ id: crypto.randomUUID(), text: o.text, correct: o.correct })),
    }))
    onInsert(questions)
    setGenerated([])
    toast.success(`${questions.length} question(s) ajoutée(s)`)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="quiz-content">Contenu source</Label>
        <Textarea
          id="quiz-content"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Collez ici le texte de la session à partir duquel générer les questions…"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quiz-count">Nombre de questions</Label>
          <Input
            id="quiz-count"
            type="number"
            min={1}
            max={15}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quiz-difficulty">Niveau</Label>
          <select
            id="quiz-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
          >
            <option value="débutant">Débutant</option>
            <option value="intermédiaire">Intermédiaire</option>
            <option value="avancé">Avancé</option>
          </select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isLoading}>
        <Sparkles className="mr-2 h-4 w-4" /> {isLoading ? 'Génération…' : 'Générer avec l’IA'}
      </Button>

      {generated.length > 0 && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-dark">{generated.length} question(s) générée(s)</p>
          {generated.map((q, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <p className="font-medium text-dark">{q.text}</p>
                <ul className="mt-2 space-y-1">
                  {q.options.map((o, j) => (
                    <li key={j} className={o.correct ? 'text-sm font-medium text-secondary' : 'text-sm text-gray'}>
                      {o.correct ? '✓' : '•'} {o.text}
                    </li>
                  ))}
                </ul>
                {q.explanation && <p className="mt-2 text-xs text-gray-400">{q.explanation}</p>}
              </CardContent>
            </Card>
          ))}
          {onInsert && (
            <Button variant="outline" onClick={handleInsert}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter ces questions à l'exercice
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
