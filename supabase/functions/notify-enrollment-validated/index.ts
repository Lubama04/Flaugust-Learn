import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Non authentifié' }, 401)

  // Client scopé au JWT de l'appelant : la RLS sur enrollments (via courses.formateur_id)
  // garantit que seul le formateur propriétaire de la formation ou un admin peut lire cette
  // inscription — pas besoin de revérifier manuellement l'appartenance ici.
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return jsonResponse({ error: 'Token invalide' }, 401)

  let enrollmentId: string
  try {
    const body = await req.json()
    enrollmentId = body?.enrollment_id
    if (!enrollmentId || typeof enrollmentId !== 'string') return jsonResponse({ error: 'enrollment_id requis' }, 400)
  } catch {
    return jsonResponse({ error: 'JSON invalide' }, 400)
  }

  const { data: enrollment, error: fetchError } = await userClient
    .from('enrollments')
    .select('id, status, student:profiles!enrollments_user_id_fkey(full_name, email), course:courses(title)')
    .eq('id', enrollmentId)
    .single<{
      id: string
      status: string
      student: { full_name: string; email: string } | null
      course: { title: string } | null
    }>()

  if (fetchError || !enrollment || !enrollment.student || !enrollment.course) {
    // RLS bloque silencieusement l'accès à une inscription hors de sa propre formation :
    // du point de vue de l'API ceci est indiscernable d'un id inexistant.
    return jsonResponse({ error: 'Inscription introuvable' }, 404)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    // Dégradation silencieuse : l'inscription est déjà validée côté client avant cet appel,
    // l'absence de clé Resend ne doit pas faire échouer la validation elle-même.
    return jsonResponse({ success: true, email_sent: false, reason: 'RESEND_API_KEY non configurée' })
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://flaugustlearn.vercel.app'
  const studentName = escapeHtml(enrollment.student.full_name)
  const courseTitle = escapeHtml(enrollment.course.title)

  const emailHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;padding:40px 0">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#7B3415;padding:32px;text-align:center">
    <h1 style="color:white;font-size:24px;margin:0">FlaugustLearn</h1>
    <p style="color:#E88930;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase">Établissement Flaugust Business</p>
  </div>
  <div style="padding:40px">
    <h2 style="color:#1A1A1A;font-size:22px;margin:0 0 16px">✅ Inscription validée, ${studentName} !</h2>
    <p style="color:#444;line-height:1.8;margin:0 0 24px">
      Votre inscription à la formation <strong style="color:#7B3415">${courseTitle}</strong> vient d'être
      validée par le formateur. Vous pouvez dès maintenant accéder au contenu et commencer votre apprentissage.
    </p>
    <div style="text-align:center;margin:32px 0">
      <a href="${appUrl}/mes-formations" style="background:#1A6B35;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">📚 Accéder à ma formation</a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #eee">
    <p style="color:#aaa;font-size:12px;margin:0">FlaugustLearn — Flaugust Business | Réflexion — Action — Impact</p>
  </div>
</div>
</body></html>`

  let emailSent = false
  let resendError: string | null = null
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'FlaugustLearn <onboarding@resend.dev>',
        to: [enrollment.student.email],
        subject: `✅ Inscription validée — ${enrollment.course.title}`,
        html: emailHtml,
      }),
    })
    emailSent = emailRes.ok
    // Diagnostic uniquement, jamais exposé à l'apprenant (seul le formateur/admin qui a validé
    // reçoit cette réponse) : capturer la vraie raison de l'échec Resend plutôt que de l'avaler
    // silencieusement, sinon un échec (ex. restriction sandbox onboarding@resend.dev tant qu'aucun
    // domaine n'est vérifié) est indiscernable d'un succès du point de vue de la validation.
    if (!emailRes.ok) resendError = await emailRes.text()
  } catch (err) {
    emailSent = false
    resendError = err instanceof Error ? err.message : 'Erreur réseau inconnue'
  }

  return jsonResponse({ success: true, email_sent: emailSent, ...(resendError ? { resend_error: resendError } : {}) })
})
