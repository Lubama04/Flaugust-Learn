import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QuestionOption { id: string; correct?: boolean }
interface Question {
  id: string
  options?: QuestionOption[]
  correct?: boolean
  answers?: string[]
  pairs?: { left: string; right: string }[]
  justification?: string
  model_answer?: string
}
interface Exercise {
  type: string
  questions: Question[]
  pass_score: number
}

function calculateScore(exercise: Exercise, answers: Record<string, unknown>) {
  const questions = exercise.questions
  let correctCount = 0
  const feedback: Record<string, unknown>[] = []

  for (const question of questions) {
    const userAnswer = answers[question.id]
    let isCorrect = false

    switch (exercise.type) {
      case 'qcm': {
        const correctIds = (question.options ?? []).filter((o) => o.correct).map((o) => o.id)
        const userIds = Array.isArray(userAnswer) ? userAnswer : [userAnswer]
        isCorrect =
          correctIds.length === userIds.length &&
          correctIds.every((id: string) => userIds.includes(id))
        feedback.push({ question_id: question.id, correct: isCorrect, correct_answer: correctIds, user_answer: userIds })
        break
      }
      case 'vrai_faux': {
        isCorrect = userAnswer === question.correct
        feedback.push({ question_id: question.id, correct: isCorrect, correct_answer: question.correct, user_answer: userAnswer, justification: question.justification })
        break
      }
      case 'texte_a_trous': {
        const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer]
        const expected = question.answers ?? []
        isCorrect = expected.every((exp, i) => String(userAnswers[i] ?? '').toLowerCase().trim() === exp.toLowerCase().trim())
        feedback.push({ question_id: question.id, correct: isCorrect, correct_answer: expected, user_answer: userAnswers })
        break
      }
      case 'association': {
        const userPairs = (userAnswer ?? {}) as Record<string, string>
        const pairs = question.pairs ?? []
        isCorrect = pairs.every((pair) => (userPairs[pair.left] ?? '').toLowerCase().trim() === pair.right.toLowerCase().trim())
        feedback.push({ question_id: question.id, correct: isCorrect, correct_answer: pairs, user_answer: userPairs })
        break
      }
      case 'ordre': {
        const expectedOrder = (question.answers ?? []) as string[]
        const userOrder = Array.isArray(userAnswer) ? (userAnswer as string[]) : []
        isCorrect = expectedOrder.length === userOrder.length && expectedOrder.every((v, i) => v === userOrder[i])
        feedback.push({ question_id: question.id, correct: isCorrect, correct_answer: expectedOrder, user_answer: userOrder })
        break
      }
      case 'reponse_courte':
      case 'upload': {
        isCorrect = false
        feedback.push({ question_id: question.id, correct: null, pending_manual_review: true, model_answer: question.model_answer, user_answer: userAnswer })
        break
      }
    }

    if (isCorrect) correctCount++
  }

  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  const passed = score >= exercise.pass_score

  return { score, passed, feedback }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { exercise_id, enrollment_id, answers, time_spent_seconds } = await req.json()
    if (!exercise_id || !enrollment_id || !answers) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: exercise, error: exError } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exercise_id)
      .single()

    if (exError || !exercise) {
      return new Response(JSON.stringify({ error: 'Exercice introuvable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('id', enrollment_id)
      .eq('user_id', user.id)
      .eq('status', 'actif')
      .single()

    if (!enrollment) {
      return new Response(JSON.stringify({ error: 'Inscription inactive' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { count: attemptCount } = await supabase
      .from('exercise_results')
      .select('*', { count: 'exact', head: true })
      .eq('exercise_id', exercise_id)
      .eq('enrollment_id', enrollment_id)

    if ((attemptCount ?? 0) >= exercise.max_attempts) {
      return new Response(JSON.stringify({ error: 'Tentatives épuisées', attempts_used: attemptCount }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (exercise.retry_delay_hours > 0 && (attemptCount ?? 0) > 0) {
      const { data: lastAttempt } = await supabase
        .from('exercise_results')
        .select('submitted_at')
        .eq('exercise_id', exercise_id)
        .eq('enrollment_id', enrollment_id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single()

      if (lastAttempt) {
        const lastTime = new Date(lastAttempt.submitted_at).getTime()
        const delayMs = exercise.retry_delay_hours * 60 * 60 * 1000
        const nextAllowed = lastTime + delayMs
        if (Date.now() < nextAllowed) {
          return new Response(
            JSON.stringify({ error: 'Délai non écoulé', next_allowed_at: new Date(nextAllowed).toISOString() }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    const { score, passed, feedback } = calculateScore(exercise as unknown as Exercise, answers)

    const { data: result, error: insertError } = await supabase
      .from('exercise_results')
      .insert({
        user_id: user.id,
        exercise_id,
        enrollment_id,
        attempt_number: (attemptCount ?? 0) + 1,
        answers_json: answers,
        score,
        passed,
        time_spent_seconds: time_spent_seconds ?? 0,
      })
      .select()
      .single()

    if (insertError || !result) {
      return new Response(JSON.stringify({ error: 'Erreur enregistrement' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: progressData } = await supabase
      .from('enrollment_progress_view')
      .select('progress_pct')
      .eq('enrollment_id', enrollment_id)
      .single()

    if (progressData) {
      await supabase
        .from('enrollments')
        .update({ progress_pct: progressData.progress_pct ?? 0 })
        .eq('id', enrollment_id)
    }

    return new Response(
      JSON.stringify({
        score,
        passed,
        feedback: exercise.show_feedback_immediately ? feedback : null,
        attempts_used: (attemptCount ?? 0) + 1,
        attempts_remaining: exercise.max_attempts - ((attemptCount ?? 0) + 1),
        result_id: result.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch {
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
