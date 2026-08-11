import { Sparkles } from 'lucide-react'
import { QuizGenerator } from '@/components/ai/QuizGenerator'

export function QuizGeneratorPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-dark">Générateur de quiz IA</h1>
      </div>
      <p className="mb-6 text-sm text-gray">
        Collez le contenu d'une session pour générer automatiquement des questions QCM avec
        Gemini. Pour ajouter directement les questions à un exercice, utilisez le bouton
        « Générer avec l'IA » depuis l'éditeur d'une session dans le studio.
      </p>
      <QuizGenerator />
    </div>
  )
}
