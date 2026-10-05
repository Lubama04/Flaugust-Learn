import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Corrige un bug réel constaté en production ("formations visibles mais impossibles à ouvrir,
// même pour un apprenant inscrit et validé, y compris les sessions en free preview") : la version
// précédente appelait `supabase.auth.getUser()` (client service_role) de façon inconditionnelle,
// AVANT même la vérification is_free_preview, pour identifier l'appelant. Cet appel dépend du
// service GoTrue de Supabase et échouait pendant un incident réel de la plateforme, bloquant
// l'accès à TOUT contenu, y compris le contenu gratuit qui ne devrait dépendre d'aucune identité.
// Cette version utilise un client scopé au JWT de l'appelant : la RLS (déjà en place sur
// enrollments/session_progress/exercise_results, vérifiée table par table) résout auth.uid()
// localement via la signature du JWT, sans appel réseau vers GoTrue. Une ligne qui n'appartient
// pas à l'appelant ne revient simplement pas, ce qui vérifie l'identité aussi sûrement que
// getUser() sans la dépendance fragile.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { session_id, enrollment_id } = await req.json()

    if (!session_id || !enrollment_id) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Toute session en free preview reste accessible même sans inscription valide : vérifié
    // AVANT la recherche de l'inscription, pour ne jamais dépendre de celle-ci.
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

    if (targetSession.is_free_preview) {
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // La RLS "Voir ses inscriptions" (user_id = auth.uid() OR formateur OR admin) garantit à elle
    // seule que cette ligne, si elle revient, appartient bien à l'appelant : pas besoin de la
    // revérifier explicitement.
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, course_id, status')
      .eq('id', enrollment_id)
      .in('status', ['actif', 'complete'])
      .single()

    if (enrollError || !enrollment) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Inscription non trouvée ou inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (moduleData.course_id !== enrollment.course_id) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Session hors du cours' }),
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

    // Exercices obligatoires de la session précédente (Gate System renforcé). Un quiz est réussi
    // quand un exercise_results.passed existe ; un exercice à soumission (texte, document,
    // Google Doc/Sheet) l'est quand sa soumission est validée par l'IA ou le formateur.
    // Si plusieurs exercices sont obligatoires, tous doivent être validés.
    const { data: mandatory } = await supabase
      .from('exercises')
      .select('id, title, submission_mode')
      .eq('session_id', previousSession.id)
      .eq('is_final_exam', false)
      .eq('obligation_level', 'obligatoire')

    for (const exercise of mandatory ?? []) {
      let validated = false
      if (exercise.submission_mode === 'quiz') {
        const { data: passedResult } = await supabase
          .from('exercise_results')
          .select('id')
          .eq('exercise_id', exercise.id)
          .eq('enrollment_id', enrollment_id)
          .eq('passed', true)
          .limit(1)
        validated = (passedResult?.length ?? 0) > 0
      } else {
        // RLS : un apprenant ne relit que ses propres soumissions.
        const { data: submissions } = await supabase
          .from('exercise_submissions')
          .select('status')
          .eq('exercise_id', exercise.id)
          .in('status', ['valide_ia', 'valide_formateur'])
          .limit(1)
        validated = (submissions?.length ?? 0) > 0
      }

      if (!validated) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: exercise.submission_mode === 'quiz' ? 'exercise_not_passed' : 'mandatory_exercise_not_validated',
            exercise_id: exercise.id,
            exercise_title: exercise.title,
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
