import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Validation IA d'une soumission d'exercice (texte libre, document PDF, Google Doc/Sheet publics).
// Appelée par le client juste après la soumission : le JWT de l'apprenant est exigé et la
// soumission est relue avec un client scopé à ce JWT, la RLS garantit donc qu'elle lui appartient.
// Les écritures de résultat passent par le service_role (les champs de validation sont protégés
// par trigger côté apprenant).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent'
const MAX_TEXT_CHARS = 30_000
const MAX_FILE_BYTES = 10 * 1024 * 1024

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

interface Evaluation {
  score: number
  feedback: string
}

class UnreadableSubmission extends Error {}

function googleExportUrl(url: string, mode: string): string | null {
  const m = url.match(/docs\.google\.com\/(document|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/)
  if (!m) return null
  const [, kind, id] = m
  if (kind === 'document' && mode === 'google_doc') return `https://docs.google.com/document/d/${id}/export?format=txt`
  if (kind === 'spreadsheets' && mode === 'google_sheet') return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`
  return null
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

async function evaluate(
  apiKey: string,
  criteria: string,
  instructions: string,
  content: { text?: string; pdfBase64?: string }
): Promise<Evaluation> {
  const prompt = `Tu évalues une soumission d'exercice e-learning.
Consignes de l'exercice : ${instructions || 'non précisées'}
Critères du formateur : ${criteria || 'Évalue la pertinence, la clarté et la complétude de la réponse par rapport aux consignes.'}
${content.text !== undefined ? `Contenu soumis par l'apprenant :\n"""\n${content.text.slice(0, MAX_TEXT_CHARS)}\n"""` : "Le document soumis par l'apprenant est joint."}
Retourne UNIQUEMENT un JSON : { "score": nombre de 0 à 100, "feedback": texte, "validated": booléen }.
Le feedback est encourageant et constructif, en français, 3 phrases maximum. N'utilise aucun tiret cadratin.`

  const parts: unknown[] = [{ text: prompt }]
  if (content.pdfBase64) parts.push({ inline_data: { mime_type: 'application/pdf', data: content.pdfBase64 } })

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 2048 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, '').trim())
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))))
  if (Number.isNaN(score)) throw new Error('Score invalide')
  return { score, feedback: String(parsed.feedback ?? '').replace(/—/g, '-').slice(0, 1000) }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Non authentifié' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let submissionId: string
  try {
    const body = await req.json()
    submissionId = body?.submission_id
    if (!submissionId || typeof submissionId !== 'string') return jsonResponse({ error: 'submission_id requis' }, 400)
  } catch {
    return jsonResponse({ error: 'JSON invalide' }, 400)
  }

  const { data: sub } = await userClient
    .from('exercise_submissions')
    .select('id, exercise_id, apprenant_id, status, submission_text, submission_file_url, submission_google_url')
    .eq('id', submissionId)
    .single()
  if (!sub) return jsonResponse({ error: 'Soumission introuvable' }, 404)
  if (sub.status === 'valide_ia' || sub.status === 'valide_formateur') return jsonResponse({ status: sub.status, unchanged: true })

  const { data: exercise } = await admin
    .from('exercises')
    .select('id, title, instructions, pass_score, submission_mode, ai_auto_validate, ai_validation_criteria, session_id, course_id')
    .eq('id', sub.exercise_id)
    .single()
  if (!exercise) return jsonResponse({ error: 'Exercice introuvable' }, 404)

  // Formateur propriétaire (pour la notification) et nom de l'apprenant.
  let courseId: string | null = exercise.course_id
  if (exercise.session_id) {
    const { data: s } = await admin.from('sessions').select('module:modules(course_id)').eq('id', exercise.session_id).single()
    courseId = (s?.module as unknown as { course_id: string } | null)?.course_id ?? courseId
  }
  const { data: course } = courseId ? await admin.from('courses').select('formateur_id, title').eq('id', courseId).single() : { data: null }
  const { data: learner } = await admin.from('profiles').select('full_name').eq('id', sub.apprenant_id).single()
  const learnerName = learner?.full_name || 'Un apprenant'

  const notifyFormateur = async (suffix: string) => {
    if (!course?.formateur_id) return
    await admin.from('notifications').insert({
      user_id: course.formateur_id,
      type: 'exercise_submission',
      title: 'Nouvelle soumission',
      message: `${learnerName} a soumis "${exercise.title}"${suffix}`,
      metadata: { submission_id: sub.id, exercise_id: exercise.id, url: '/formateur/soumissions' },
    })
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  let evaluation: Evaluation | null = null
  let pendingReason: string | null = null

  if (!exercise.ai_auto_validate) {
    pendingReason = 'validation manuelle requise'
  } else if (!apiKey) {
    pendingReason = 'IA indisponible'
  } else {
    try {
      let content: { text?: string; pdfBase64?: string }
      if (exercise.submission_mode === 'texte_libre') {
        content = { text: sub.submission_text ?? '' }
        if (!content.text?.trim()) throw new UnreadableSubmission('texte vide')
      } else if (exercise.submission_mode === 'upload_document') {
        const path = sub.submission_file_url
        if (!path) throw new UnreadableSubmission('fichier absent')
        if (!path.toLowerCase().endsWith('.pdf')) throw new UnreadableSubmission("format non lisible par l'IA")
        const { data: file, error } = await admin.storage.from('exercise-submissions').download(path)
        if (error || !file) throw new UnreadableSubmission('fichier introuvable')
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (bytes.length > MAX_FILE_BYTES) throw new UnreadableSubmission('fichier trop volumineux')
        content = { pdfBase64: toBase64(bytes) }
      } else {
        const exportUrl = sub.submission_google_url ? googleExportUrl(sub.submission_google_url, exercise.submission_mode) : null
        if (!exportUrl) throw new UnreadableSubmission('lien invalide')
        const r = await fetch(exportUrl, { redirect: 'follow' })
        const type = r.headers.get('content-type') ?? ''
        if (!r.ok || type.includes('text/html')) throw new UnreadableSubmission('document non public')
        content = { text: await r.text() }
      }
      evaluation = await evaluate(apiKey, exercise.ai_validation_criteria ?? '', exercise.instructions ?? '', content)
    } catch (err) {
      pendingReason = err instanceof UnreadableSubmission ? err.message : 'IA indisponible'
      if (!(err instanceof UnreadableSubmission)) console.error('validate-exercise', (err as Error).message)
    }
  }

  if (!evaluation) {
    await admin.from('exercise_submissions').update({ status: 'soumis' }).eq('id', sub.id)
    await notifyFormateur(` (${pendingReason}). Une révision de votre part est nécessaire.`)
    return jsonResponse({ status: 'soumis', pending_review: true, reason: pendingReason })
  }

  const passed = evaluation.score >= (exercise.pass_score ?? 70)
  const status = passed ? 'valide_ia' : 'rejete'
  await admin
    .from('exercise_submissions')
    .update({ status, ai_score: evaluation.score, ai_feedback: evaluation.feedback, ai_validated_at: new Date().toISOString() })
    .eq('id', sub.id)

  await admin.from('notifications').insert({
    user_id: sub.apprenant_id,
    type: passed ? 'exercise_validated' : 'exercise_rejected',
    title: passed ? 'Exercice validé !' : 'Exercice à revoir',
    message: evaluation.feedback.slice(0, 200) || (passed ? 'Bravo, votre exercice est validé.' : 'Reprenez votre exercice et soumettez-le à nouveau.'),
    metadata: { submission_id: sub.id, exercise_id: exercise.id, url: '/mon-espace' },
  })
  await notifyFormateur(` : ${evaluation.score}/100${passed ? '' : " (rejetée par l'IA, à réviser)"}`)

  return jsonResponse({ status, score: evaluation.score, feedback: evaluation.feedback, passed })
})
