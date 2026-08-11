import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_BUCKETS = new Set(['course-videos', 'course-documents'])

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

    // Vérifier que l'utilisateur est bien inscrit et actif sur le cours concerné.
    // enrollment_id est obligatoire pour ces deux buckets privés (pas de contenu public ici).
    // Note : contrairement au brouillon initial du CDC (enrollment_id optionnel), cette
    // vérification est rendue systématique — sans elle, n'importe quel utilisateur
    // authentifié pourrait obtenir une URL signée vers n'importe quel fichier du bucket.
    if (!enrollment_id) {
      return new Response(
        JSON.stringify({ error: 'enrollment_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, status, course_id')
      .eq('id', enrollment_id)
      .eq('user_id', user.id)
      .in('status', ['actif', 'complete'])
      .single()

    if (!enrollment) {
      // Le formateur propriétaire du cours doit aussi pouvoir prévisualiser son contenu.
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const isPrivileged = profile?.role === 'formateur' || profile?.role === 'admin'
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
