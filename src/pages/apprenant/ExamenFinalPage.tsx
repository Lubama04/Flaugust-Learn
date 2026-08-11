import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Award, CheckCircle2, GraduationCap, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useExercise } from '@/hooks/useExercise'
import { useCertificate } from '@/hooks/useCertificate'
import { useToast } from '@/hooks/useToast'
import { examenFinalRoute } from '@/router'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { ExerciseRenderer } from '@/components/reader/ExerciseRenderer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

async function fetchExamContext(slug: string, userId: string) {
  const { data: course, error: courseError } = await supabase.from('courses').select('id, title').eq('slug', slug).single()
  if (courseError) throw courseError

  // "complete" doit rester accessible (cours déjà terminé sans examen final configuré,
  // ou retour sur la page après coup) — même raison que dans CourseReaderPage.
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('course_id', course.id)
    .eq('user_id', userId)
    .in('status', ['actif', 'complete'])
    .maybeSingle()

  if (!enrollment) return { course, enrollment: null, isComplete: false, finalExam: null }

  const { data: isComplete } = await supabase.rpc('check_course_completion', { p_enrollment_id: enrollment.id })

  const { data: finalExam } = await supabase
    .from('exercises')
    .select('*')
    .eq('course_id', course.id)
    .eq('is_final_exam', true)
    .maybeSingle()

  return { course, enrollment, isComplete: isComplete ?? false, finalExam }
}

function ExamenFinalContent() {
  const { slug } = examenFinalRoute.useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const userId = useAuthStore((s) => s.session?.user.id)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [startedAt] = useState(() => Date.now())
  const { mutate: submitExercise, isPending: isSubmitting, data: examResult } = useExercise()
  const { mutate: generateCertificate, isPending: isGeneratingCert } = useCertificate()

  const { data, isLoading } = useQuery({
    queryKey: ['examen-final', slug, userId],
    queryFn: () => fetchExamContext(slug, userId!),
    enabled: !!userId,
  })

  const handleGenerateCertificate = (enrollmentId: string) => {
    generateCertificate(enrollmentId, {
      onSuccess: (result) => {
        void navigate({ to: '/certificat/$id', params: { id: result.certificate_id } })
      },
      onError: () => toast.error('Erreur lors de la génération du certificat'),
    })
  }

  const handleSubmit = () => {
    if (!data?.finalExam || !data.enrollment) return
    submitExercise(
      {
        exerciseId: data.finalExam.id,
        enrollmentId: data.enrollment.id,
        answers,
        timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
      },
      {
        onSuccess: (result) => {
          if (result.passed) handleGenerateCertificate(data.enrollment!.id)
        },
        onError: () => toast.error("Erreur lors de la soumission de l'examen"),
      }
    )
  }

  if (isLoading || !data) return <LoadingSpinner label="Chargement de l'examen final…" />

  if (!data.enrollment) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-gray">Vous n'êtes pas inscrit à cette formation.</p>
        <Link to="/formation/$slug" params={{ slug }} className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Retour à la formation
        </Link>
      </div>
    )
  }

  if (!data.isComplete) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Award className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-dark">Formation non terminée</h1>
        <p className="mt-2 text-gray">
          Terminez toutes les sessions et validez tous les exercices avant de passer l'examen final.
        </p>
        <Link to="/formation/$slug/apprendre" params={{ slug }} className="mt-6 inline-block">
          <Button>Reprendre la formation</Button>
        </Link>
      </div>
    )
  }

  // Pas d'examen final configuré : le certificat peut être généré directement.
  if (!data.finalExam) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <GraduationCap className="mx-auto h-14 w-14 text-lime" />
        <h1 className="mt-4 font-display text-2xl font-bold text-dark">Formation terminée !</h1>
        <p className="mt-2 text-gray">Vous avez complété toutes les sessions de « {data.course.title} ».</p>
        <Button className="mt-6" size="lg" onClick={() => handleGenerateCertificate(data.enrollment!.id)} disabled={isGeneratingCert}>
          {isGeneratingCert ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
          Obtenir mon certificat
        </Button>
      </div>
    )
  }

  if (examResult?.passed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-lime" />
        <h1 className="mt-4 font-display text-2xl font-bold text-dark">🎉 Félicitations !</h1>
        <p className="mt-2 text-gray">
          Vous avez réussi l'examen final avec un score de {examResult.score}%. Génération de votre certificat…
        </p>
        <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const questionCount = Array.isArray(data.finalExam.questions) ? data.finalExam.questions.length : 0
  const answeredCount = Object.keys(answers).length

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <GraduationCap className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-3 font-display text-3xl font-bold text-dark">Examen final</h1>
        <p className="mt-1 text-gray">{data.course.title}</p>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="space-y-6 pt-6">
          {data.finalExam.instructions && <p className="text-sm text-gray">{data.finalExam.instructions}</p>}

          {examResult && !examResult.passed && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              Score insuffisant ({examResult.score}%, minimum requis {data.finalExam.pass_score}%). Tentatives restantes :{' '}
              {examResult.attempts_remaining}.
            </p>
          )}

          <ExerciseRenderer
            exercise={data.finalExam}
            answers={answers}
            onAnswerChange={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
            disabled={isSubmitting}
          />

          <p className="text-xs text-gray-400">
            {answeredCount} / {questionCount} question(s) répondue(s)
          </p>

          <Button size="lg" className="w-full" onClick={handleSubmit} disabled={isSubmitting || answeredCount === 0}>
            {isSubmitting ? 'Envoi…' : "Valider l'examen final"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function ExamenFinalPage() {
  return (
    <ProtectedRoute allowedRoles={['apprenant', 'admin']}>
      <ExamenFinalContent />
    </ProtectedRoute>
  )
}
