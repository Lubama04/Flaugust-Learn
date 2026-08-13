import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Déclenchée par un trigger Postgres (AFTER INSERT ON enrollments, via pg_net), donc sans JWT
// utilisateur — déployée avec verify_jwt=false. Voir send-notifications pour le même arbitrage
// documenté (endpoint interne non authentifiable par nature, effet borné à une notification +
// un email, idempotence non critique ici car un enrollment_id ne peut déclencher ce trigger
// qu'une seule fois — un seul INSERT par ligne).
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

  let enrollmentId: string
  try {
    const body = await req.json()
    enrollmentId = body?.enrollment_id
    if (!enrollmentId || typeof enrollmentId !== 'string') return jsonResponse({ error: 'enrollment_id requis' }, 400)
  } catch {
    return jsonResponse({ error: 'JSON invalide' }, 400)
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select(`
      id, created_at, user_id,
      student:profiles!enrollments_user_id_fkey(full_name, email, phone),
      course:courses(id, title, formateur_id)
    `)
    .eq('id', enrollmentId)
    .single<{
      id: string
      created_at: string
      user_id: string
      student: { full_name: string; email: string; phone: string | null } | null
      course: { id: string; title: string; formateur_id: string } | null
    }>()

  if (!enrollment || !enrollment.student || !enrollment.course) {
    return jsonResponse({ error: 'Inscription introuvable' }, 404)
  }

  const { data: formateur } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', enrollment.course.formateur_id)
    .single()
  if (!formateur) return jsonResponse({ error: 'Formateur introuvable' }, 404)

  const dateLabel = new Date(enrollment.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const phoneLabel = enrollment.student.phone || 'non renseigné'
  const message = `${enrollment.student.full_name} souhaite rejoindre votre formation.
Email : ${enrollment.student.email}
Téléphone : ${phoneLabel}
Date : ${dateLabel}
Contactez-le pour convenir du paiement avant de valider son inscription.`

  await supabase.from('notifications').insert({
    user_id: enrollment.course.formateur_id,
    type: 'nouvelle_inscription',
    title: `📩 Nouvelle inscription — ${enrollment.course.title}`,
    message,
    metadata: { enrollment_id: enrollment.id, course_id: enrollment.course.id, apprenant_id: enrollment.user_id },
  })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  let emailSent = false
  if (resendKey) {
    const courseTitle = escapeHtml(enrollment.course.title)
    const studentName = escapeHtml(enrollment.student.full_name)
    const studentEmail = escapeHtml(enrollment.student.email)
    const phoneEsc = escapeHtml(phoneLabel)
    const appUrl = Deno.env.get('APP_URL') ?? 'https://flaugustlearn.vercel.app'

    const emailHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;padding:40px 0">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#7B3415;padding:32px;text-align:center">
    <h1 style="color:white;font-size:24px;margin:0">FlaugustLearn</h1>
    <p style="color:#E88930;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase">Établissement Flaugust Business</p>
  </div>
  <div style="padding:40px">
    <h2 style="color:#1A1A1A;font-size:22px;margin:0 0 16px">📩 Nouvelle inscription — ${courseTitle}</h2>
    <p style="color:#444;line-height:1.8;margin:0 0 8px"><strong>${studentName}</strong> souhaite rejoindre votre formation.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#444;font-size:14px;margin:4px 0"><strong>Email :</strong> ${studentEmail}</p>
      <p style="color:#444;font-size:14px;margin:4px 0"><strong>Téléphone :</strong> ${phoneEsc}</p>
      <p style="color:#444;font-size:14px;margin:4px 0"><strong>Date :</strong> ${escapeHtml(dateLabel)}</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:16px 0 24px">
      Contactez-le pour convenir du paiement avant de valider son inscription.
    </p>
    <div style="text-align:center;margin:32px 0">
      <a href="${appUrl}/formateur/inscriptions" style="background:#1A6B35;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">Voir les inscriptions en attente</a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #eee">
    <p style="color:#aaa;font-size:12px;margin:0">FlaugustLearn — Flaugust Business | Réflexion — Action — Impact</p>
  </div>
</div>
</body></html>`

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'FlaugustLearn <onboarding@resend.dev>',
          to: [formateur.email],
          subject: `📩 Nouvelle inscription — ${enrollment.course.title}`,
          html: emailHtml,
        }),
      })
      emailSent = emailRes.ok
    } catch {
      emailSent = false
    }
  }

  return jsonResponse({ success: true, email_sent: emailSent })
})
