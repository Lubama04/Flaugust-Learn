import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GeminiQuotaExceededError, runCourseOrganizer } from './organizer-core.ts'

// Appelée par un job pg_cron (net.http_post) chaque jour à 00:05 UTC, donc sans JWT utilisateur,
// déployée avec verify_jwt=false, exactement comme send-notifications-job/send-notifications déjà
// en place sur ce projet. Un appel répété ou externe de cet endpoint public reste sans effet
// néfaste au-delà d'un déclenchement inutile : il ne fait que traiter des lignes 'pending' déjà
// insérées par un formateur authentifié (RLS formateur_id = auth.uid() au moment de l'insertion),
// et chaque ligne passe à 'processing' puis 'done'/'error', donc un rappel n'a rien à retraiter.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Protection contre un run qui traiterait un lot trop long (chaque appel Gemini peut prendre
// plusieurs dizaines de secondes avec les retries) : borne haute raisonnable pour une exécution
// cron quotidienne.
const MAX_SESSIONS_PER_RUN = 15

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

interface PendingRow {
  id: string
  formateur_id: string
  course_id: string
  file_name: string
  file_content: string | null
  file_base64: string | null
  file_mime_type: string | null
  instructions: string | null
  options: { create_exercises?: boolean; create_worksheets?: boolean; add_to_resources?: boolean; auto_publish?: boolean }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return jsonResponse({ error: 'Clé API Gemini non configurée' }, 500)

  const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: pending, error: fetchError } = await adminClient
    .from('pending_ai_sessions')
    .select('id, formateur_id, course_id, file_name, file_content, file_base64, file_mime_type, instructions, options')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(MAX_SESSIONS_PER_RUN)

  if (fetchError) return jsonResponse({ error: fetchError.message }, 500)
  if (!pending || pending.length === 0) {
    return jsonResponse({ success: true, processed: 0, done: 0, errors: 0, quota_hit: false })
  }

  let doneCount = 0
  let errorCount = 0
  let quotaHit = false
  // Une notification agrégée par formateur plutôt qu'une par session traitée : évite de noyer
  // un formateur qui aurait plusieurs fichiers en file d'attente sous une rafale de notifications.
  const doneByFormateur = new Map<string, string[]>()

  for (const row of pending as PendingRow[]) {
    await adminClient.from('pending_ai_sessions').update({ status: 'processing' }).eq('id', row.id)

    try {
      const result = await runCourseOrganizer(adminClient, apiKey, {
        formateurId: row.formateur_id,
        isAdmin: false,
        targetCourseId: row.course_id,
        instructions: row.instructions,
        fileName: row.file_name,
        textContent: row.file_content,
        fileBase64: row.file_base64,
        fileMimeType: row.file_mime_type,
        options: {
          create_exercises: row.options?.create_exercises ?? true,
          create_worksheets: row.options?.create_worksheets ?? true,
          add_to_resources: row.options?.add_to_resources ?? true,
          auto_publish: row.options?.auto_publish ?? false,
        },
      })

      await adminClient
        .from('pending_ai_sessions')
        .update({ status: 'done', result, processed_at: new Date().toISOString() })
        .eq('id', row.id)
      doneCount += 1
      const list = doneByFormateur.get(row.formateur_id) ?? []
      list.push(row.file_name)
      doneByFormateur.set(row.formateur_id, list)
    } catch (err) {
      if (err instanceof GeminiQuotaExceededError) {
        // Le quota journalier est de nouveau épuisé : remettre la ligne en 'pending' (ce n'est
        // pas un échec de son contenu) et arrêter tout le run, les lignes suivantes échoueraient
        // pour la même raison.
        await adminClient.from('pending_ai_sessions').update({ status: 'pending' }).eq('id', row.id)
        quotaHit = true
        break
      }
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      await adminClient
        .from('pending_ai_sessions')
        .update({ status: 'error', error_message: message, processed_at: new Date().toISOString() })
        .eq('id', row.id)
      errorCount += 1
    }
  }

  for (const [formateurId, fileNames] of doneByFormateur) {
    await adminClient.from('notifications').insert({
      user_id: formateurId,
      type: 'quota_reset',
      title: 'Votre quota IA est réinitialisé',
      message:
        fileNames.length === 1
          ? `"${fileNames[0]}" a été traité automatiquement. Vous pouvez consulter le résultat depuis l'Assistant IA Formateur.`
          : `${fileNames.length} fichiers en attente ont été traités automatiquement (${fileNames.join(', ')}). Vous pouvez consulter le résultat depuis l'Assistant IA Formateur.`,
      metadata: { file_names: fileNames },
    })
  }

  return jsonResponse({ success: true, processed: doneCount + errorCount, done: doneCount, errors: errorCount, quota_hit: quotaHit })
})
