import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_BUCKETS = new Set(['course-videos', 'course-documents', 'course-resources'])

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
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { bucket, path, enrollment_id } = await req.json()

    if (!bucket || !path || !ALLOWED_BUCKETS.has(bucket)) {
      return new Response(
        JSON.stringify({ error: 'Bucket non autorisé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Le chemin encode toujours le cours propriétaire en premier segment
    // ({course_id}/{uuid}.{ext} — convention utilisée par tous les uploads formateur).
    const pathCourseId = String(path).split('/')[0]

    // Vérifier que l'utilisateur est bien inscrit et actif sur LE COURS PROPRIÉTAIRE DU
    // FICHIER demandé (pas juste inscrit à une formation quelconque — sans ce contrôle,
    // une inscription valide sur le cours A donnait accès à n'importe quel fichier privé
    // du cours B tant que le status était actif/complete, IDOR). enrollment_id reste
    // optionnel côté API : un formateur ou un admin prévisualisant son propre contenu n'a
    // logiquement pas d'inscription, il tombe alors sur la vérification de privilège ci-dessous.
    let enrollmentMatchesPath = false
    if (enrollment_id) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id, status, course_id')
        .eq('id', enrollment_id)
        .eq('user_id', user.id)
        .in('status', ['actif', 'complete'])
        .single()
      enrollmentMatchesPath = !!enrollment && enrollment.course_id === pathCourseId
    }

    if (!enrollmentMatchesPath) {
      // Le formateur propriétaire de CE cours (pas n'importe quel formateur) ou un admin
      // peut aussi prévisualiser le contenu.
      const { data: course } = await supabase
        .from('courses')
        .select('formateur_id')
        .eq('id', pathCourseId)
        .single()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const isPrivileged =
        profile?.role === 'admin' || (profile?.role === 'formateur' && course?.formateur_id === user.id)
      if (!isPrivileged) {
        return new Response(
          JSON.stringify({ error: 'Accès non autorisé' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600)

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "Impossible de générer l'URL" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl, expiresIn: 3600 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
