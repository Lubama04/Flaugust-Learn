import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GeminiQuotaExceededError, runCourseOrganizer } from './organizer-core.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// Minuit UTC du jour courant si on est avant minuit, sinon minuit UTC du lendemain : c'est
// exactement l'heure de réinitialisation du quota journalier gratuit de Gemini.
function nextUtcMidnight(): string {
  const d = new Date()
  d.setUTCHours(24, 0, 0, 0)
  return d.toISOString()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Non authentifié' }, 401)

  // Client scopé au JWT de l'appelant : sert uniquement à identifier l'utilisateur et son rôle.
  // Le formateur propriétaire est TOUJOURS déduit du JWT, jamais d'un identifiant envoyé dans le
  // corps de la requête.
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return jsonResponse({ error: 'Token invalide' }, 401)

  const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'formateur' && profile.role !== 'admin')) {
    return jsonResponse({ error: 'Accès réservé aux formateurs' }, 403)
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return jsonResponse({ error: 'Clé API Gemini non configurée' }, 500)

  let body: {
    instructions?: string | null
    file_name?: string | null
    text_content?: string | null
    file_base64?: string | null
    file_mime_type?: string | null
    target_course_id?: string | null
    options?: { create_exercises?: boolean; create_worksheets?: boolean; add_to_resources?: boolean; auto_publish?: boolean }
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON invalide' }, 400)
  }

  // Écriture (et relecture d'état frais) avec le client service_role : la propriété du
  // formateur sur la formation ciblée est vérifiée explicitement dans runCourseOrganizer.
  const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const result = await runCourseOrganizer(adminClient, apiKey, {
      formateurId: user.id,
      isAdmin: profile.role === 'admin',
      targetCourseId: body.target_course_id ?? null,
      instructions: body.instructions?.trim() || null,
      fileName: body.file_name ?? null,
      textContent: body.text_content ?? null,
      fileBase64: body.file_base64 ?? null,
      fileMimeType: body.file_mime_type ?? null,
      options: {
        create_exercises: body.options?.create_exercises ?? true,
        create_worksheets: body.options?.create_worksheets ?? true,
        add_to_resources: body.options?.add_to_resources ?? true,
        auto_publish: body.options?.auto_publish ?? false,
      },
    })
    return jsonResponse({ success: true, ...result })
  } catch (err) {
    if (err instanceof GeminiQuotaExceededError) {
      return jsonResponse(
        {
          error: 'quota_exceeded',
          message: 'Limite quotidienne Gemini atteinte',
          reset_at: nextUtcMidnight(),
        },
        429
      )
    }
    return jsonResponse({ error: `Analyse IA impossible : ${err instanceof Error ? err.message : 'erreur inconnue'}` }, 502)
  }
})
