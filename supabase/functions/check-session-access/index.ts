import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { session_id, enrollment_id } = await req.json()

    if (!session_id || !enrollment_id) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, user_id, course_id, status')
      .eq('id', enrollment_id)
      .eq('user_id', user.id)
      .eq('status', 'actif')
      .single()

    if (enrollError || !enrollment) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Inscription non trouvée ou inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: targetSession, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id, order_index, is_free_preview,
        module:modules!inner (
          id, order_index, course_id
        )
      `)
      .eq('id', session_id)
      .single()

    if (sessionError || !targetSession) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Session introuvable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const moduleData = targetSession.module as unknown as { id: string; order_index: number; course_id: string }

    if (moduleData.course_id !== enrollment.course_id) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Session hors du cours' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetSession.is_free_preview) {
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isFirstModule = moduleData.order_index === 0
    const isFirstSession = targetSession.order_index === 0
    if (isFirstModule && isFirstSession) {
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let previousSession: { id: string; order_index: number } | null = null

    if (targetSession.order_index > 0) {
      const { data: prevInModule } = await supabase
        .from('sessions')
        .select('id, order_index')
        .eq('module_id', moduleData.id)
        .eq('order_index', targetSession.order_index - 1)
        .single()
      previousSession = prevInModule
    } else {
      const { data: prevModule } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', enrollment.course_id)
        .eq('order_index', moduleData.order_index - 1)
        .single()

      if (prevModule) {
        const { data: lastSessionOfPrevModule } = await supabase
          .from('sessions')
          .select('id, order_index')
          .eq('module_id', prevModule.id)
          .order('order_index', { ascending: false })
          .limit(1)
          .single()
        previousSession = lastSessionOfPrevModule
      }
    }

    if (!previousSession) {
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: prevProgress } = await supabase
      .from('session_progress')
      .select('is_completed')
      .eq('enrollment_id', enrollment_id)
      .eq('session_id', previousSession.id)
      .single()

    if (!prevProgress?.is_completed) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'session_not_completed',
          previous_session_id: previousSession.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: prevExercise } = await supabase
      .from('exercises')
      .select('id, pass_score')
      .eq('session_id', previousSession.id)
      .eq('is_final_exam', false)
      .single()

    if (prevExercise) {
      const { data: passedResult } = await supabase
        .from('exercise_results')
        .select('id, passed')
        .eq('exercise_id', prevExercise.id)
        .eq('enrollment_id', enrollment_id)
        .eq('passed', true)
        .limit(1)
        .single()

      if (!passedResult) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'exercise_not_passed',
            exercise_id: prevExercise.id,
            previous_session_id: previousSession.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch {
    return new Response(
      JSON.stringify({ allowed: false, reason: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
