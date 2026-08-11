import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExerciseResultRow {
  id: string
  score: number
  passed: boolean
  attempt_number: number
  submitted_at: string
  answers_json: unknown
  exercise: {
    id: string
    title: string
    type: string
    questions: unknown
    pass_score: number
    is_final_exam: boolean
    session: { title: string; module: { title: string } | null } | null
  } | null
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

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { enrollment_id } = await req.json()
    if (!enrollment_id) {
      return new Response(JSON.stringify({ error: 'enrollment_id requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select(`
        id,
        course:courses(title, duration_hours),
        student:profiles!enrollments_user_id_fkey(full_name, email)
      `)
      .eq('id', enrollment_id)
      .eq('user_id', user.id)
      .single<{ id: string; course: { title: string; duration_hours: number } | null; student: { full_name: string; email: string } | null }>()

    if (!enrollment) {
      return new Response(JSON.stringify({ error: 'Inscription introuvable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: results } = await supabase
      .from('exercise_results')
      .select(`
        id, score, passed, attempt_number, submitted_at, answers_json,
        exercise:exercises(
          id, title, type, questions, pass_score, is_final_exam,
          session:sessions(title, module:modules(title))
        )
      `)
      .eq('enrollment_id', enrollment_id)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: true })
      .returns<ExerciseResultRow[]>()

    const exportData = {
      student: enrollment.student,
      course: enrollment.course,
      generated_at: new Date().toISOString(),
      total_exercises: results?.length ?? 0,
      passed_exercises: results?.filter((r) => r.passed).length ?? 0,
      assessments: (results ?? []).map((r) => ({
        exercise_title: r.exercise?.title ?? '',
        exercise_type: r.exercise?.type ?? '',
        is_final_exam: r.exercise?.is_final_exam ?? false,
        session_title: r.exercise?.session?.title ?? '',
        module_title: r.exercise?.session?.module?.title ?? '',
        questions: r.exercise?.questions ?? [],
        user_answers: r.answers_json,
        score: r.score,
        pass_score: r.exercise?.pass_score ?? 0,
        passed: r.passed,
        attempt_number: r.attempt_number,
        submitted_at: r.submitted_at,
      })),
    }

    return new Response(JSON.stringify(exportData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
