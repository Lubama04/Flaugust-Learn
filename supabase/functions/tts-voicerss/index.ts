import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Filet de sécurité côté serveur, en plus du découpage en morceaux fait côté client : même si
// un appel isolé arrivait avec un texte trop long, il est tronqué plutôt que de gaspiller un
// appel VoiceRSS voué à l'échec.
const MAX_CHARS = 1600

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Authentification requise : sans ça, cet endpoint proxy vers une API tierce payante/à quota
  // serait appelable anonymement par quiconque en découvre l'URL, ouvrant un vecteur d'abus
  // (épuisement du quota VoiceRSS) — le CDC proposait --no-verify-jwt, ce qui n'a aucune raison
  // d'être ici puisque l'appel part toujours d'une session apprenant déjà authentifiée.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Non authentifié' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return jsonResponse({ error: 'Token invalide' }, 401)

  let text: string
  let gender: string
  try {
    const body = await req.json()
    text = typeof body?.text === 'string' ? body.text : ''
    gender = body?.gender === 'male' ? 'male' : 'female'
  } catch {
    return jsonResponse({ error: 'JSON invalide' }, 400)
  }

  const cleanText = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS)

  if (!cleanText) return jsonResponse({ error: 'Texte vide' }, 400)

  const apiKey = Deno.env.get('VOICERSS_API_KEY')
  if (!apiKey) return jsonResponse({ error: 'Clé VoiceRSS non configurée' }, 500)

  // Voix féminine = voix par défaut fr-fr de VoiceRSS ; voix masculine = Pierre (seule voix
  // masculine française proposée par VoiceRSS).
  const voiceParam = gender === 'male' ? '&v=Pierre' : ''
  const url = `https://api.voicerss.org/?key=${apiKey}&hl=fr-fr&src=${encodeURIComponent(cleanText)}&c=MP3&f=44khz_16bit_stereo&r=0${voiceParam}`

  let voiceRssResponse: Response
  try {
    voiceRssResponse = await fetch(url)
  } catch {
    return jsonResponse({ error: 'Impossible de joindre VoiceRSS' }, 502)
  }

  if (!voiceRssResponse.ok) {
    return jsonResponse({ error: 'Erreur VoiceRSS' }, 502)
  }

  // VoiceRSS renvoie du texte brut (pas de content-type JSON) en cas d'erreur (clé invalide,
  // quota dépassé, paramètre incorrect...) avec un statut HTTP 200 — la seule façon fiable de
  // distinguer un succès d'un échec est de vérifier le content-type de la réponse.
  const contentType = voiceRssResponse.headers.get('content-type') ?? ''
  if (!contentType.includes('audio')) {
    const errorText = await voiceRssResponse.text()
    return jsonResponse({ error: errorText || 'Erreur VoiceRSS' }, 502)
  }

  const audioBuffer = await voiceRssResponse.arrayBuffer()
  return new Response(audioBuffer, {
    headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
  })
})
