import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Déclenchée par un trigger Postgres (AFTER INSERT ON profiles, via pg_net), donc sans JWT
// utilisateur — déployée avec verify_jwt=false. Les profils sont de toute façon en lecture
// publique (policy "Profil public visible" using(true)) : cet endpoint ne fait que renvoyer
// à une adresse déjà publique l'email qui lui est destiné, aucune confidentialité nouvelle
// n'est exposée par son caractère non authentifié. Voir send-notifications pour le même
// arbitrage documenté.
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

  let profileId: string
  try {
    const body = await req.json()
    profileId = body?.profile_id
    if (!profileId || typeof profileId !== 'string') return jsonResponse({ error: 'profile_id requis' }, 400)
  } catch {
    return jsonResponse({ error: 'JSON invalide' }, 400)
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', profileId).single()
  if (!profile) return jsonResponse({ error: 'Profil introuvable' }, 404)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return jsonResponse({ success: true, email_sent: false, reason: 'RESEND_API_KEY non configurée' })
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://flaugustlearn.vercel.app'
  const fullName = escapeHtml(profile.full_name || 'Nouveau membre')

  const emailHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;padding:40px 0">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#7B3415;padding:32px;text-align:center">
    <h1 style="color:white;font-size:24px;margin:0">FlaugustLearn</h1>
    <p style="color:#E88930;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase">Établissement Flaugust Business</p>
  </div>
  <div style="padding:40px">
    <h2 style="color:#1A1A1A;font-size:22px;margin:0 0 16px">🎉 Bienvenue, ${fullName} !</h2>
    <p style="color:#444;line-height:1.8;margin:0 0 24px">
      Votre compte FlaugustLearn vient d'être créé avec l'adresse <strong>${escapeHtml(profile.email)}</strong>.
      Vous pouvez dès maintenant explorer notre catalogue de formations professionnelles conçues
      pour l'Afrique francophone.
    </p>
    <div style="text-align:center;margin:32px 0">
      <a href="${appUrl}/catalogue" style="background:#1A6B35;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">📚 Explorer les formations</a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #eee">
    <p style="color:#aaa;font-size:12px;margin:0">FlaugustLearn — Flaugust Business | Réflexion — Action — Impact</p>
  </div>
</div>
</body></html>`

  let emailSent = false
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'FlaugustLearn <onboarding@resend.dev>',
        to: [profile.email],
        subject: 'Bienvenue sur FlaugustLearn — Votre compte est créé',
        html: emailHtml,
      }),
    })
    emailSent = emailRes.ok
  } catch {
    emailSent = false
  }

  return jsonResponse({ success: true, email_sent: emailSent })
})
