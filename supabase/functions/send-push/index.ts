import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Appelée par d'autres edge functions et par un trigger (verify_jwt=false). Le garde ci-dessous
// exige la clé service_role ou le jeton interne : sans lui, n'importe qui pourrait envoyer des
// notifications à n'importe quel utilisateur.
// Les clés VAPID sont lues d'abord depuis les secrets d'environnement, sinon depuis la table
// app_secrets (inaccessible aux rôles anon/authenticated).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  // Deux appelants légitimes : les edge functions (Bearer service_role) et le trigger Postgres
  // sur `notifications` (jeton interne partagé, stocké dans app_secrets).
  let authorized = req.headers.get('Authorization') === `Bearer ${serviceKey}`
  const internalToken = req.headers.get('x-push-token')
  if (!authorized && internalToken) {
    const { data: tok } = await supabase.from('app_secrets').select('value').eq('key', 'PUSH_INTERNAL_TOKEN').maybeSingle()
    authorized = !!tok && tok.value === internalToken
  }
  if (!authorized) return jsonResponse({ error: 'Non autorisé' }, 401)

  let body: { user_ids?: string[]; title?: string; body?: string; url?: string; tag?: string; notification_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON invalide' }, 400)
  }
  if (!Array.isArray(body.user_ids) || body.user_ids.length === 0 || !body.title) {
    return jsonResponse({ error: 'user_ids et title requis' }, 400)
  }

  const { data: secrets } = await supabase.from('app_secrets').select('key, value').in('key', ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'])
  const cfg = Object.fromEntries((secrets ?? []).map((s: { key: string; value: string }) => [s.key, s.value]))
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? cfg.VAPID_PUBLIC_KEY
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? cfg.VAPID_PRIVATE_KEY
  const subject = Deno.env.get('VAPID_SUBJECT') ?? cfg.VAPID_SUBJECT ?? 'mailto:contact@flaugustbusiness.com'
  if (!publicKey || !privateKey) return jsonResponse({ error: 'Clés VAPID non configurées' }, 500)
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .in('user_id', body.user_ids)
  if (error) return jsonResponse({ error: error.message }, 500)

  const payload = JSON.stringify({
    title: body.title,
    body: body.body ?? '',
    url: body.url ?? '/',
    tag: body.tag ?? 'flaugustlearn',
    notificationId: body.notification_id,
  })

  let sent = 0
  let removed = 0
  let failed = 0
  await Promise.all(
    (subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth_key: string }) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, payload, { TTL: 86400 })
        sent++
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id)
          removed++
        } else {
          failed++
          console.error('push failed', code, (err as Error).message)
        }
      }
    })
  )

  return jsonResponse({ sent, removed, failed, devices: subs?.length ?? 0 })
})
