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
  // (épuisement du quota VoiceRSS). Le frontend appelle systématiquement depuis une session
  // apprenant déjà authentifiée, et le hook bascule automatiquement sur Web Speech API si cet
  // endpoint échoue pour une raison quelconque — donc aucune perte de fonctionnalité à garder
  // cette vérification.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Non authentifié' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return jsonResponse({ error: 'Token invalide' }, 401)

  let text: string
  try {
    const body = await req.json()
    text = typeof body?.text === 'string' ? body.text : ''
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

  // Format léger (mono 16kHz) : plus rapide à générer/transférer que du stéréo 44kHz, ce qui
  // aide la lecture séquentielle par morceaux côté client. Le paramètre de voix (v=) n'est plus
  // envoyé : laisser VoiceRSS choisir sa voix fr-fr par défaut évite les erreurs de voix
  // introuvable (ex. "Pierre" refusé selon le compte/plan VoiceRSS) ; la distinction homme/femme
  // reste assurée côté client par le fallback Web Speech, qui a un vrai choix de voix par genre.
  const params = new URLSearchParams({
    key: apiKey,
    hl: 'fr-fr',
    src: cleanText,
    c: 'MP3',
    f: '16khz_16bit_mono',
    r: '0',
  })
  const url = `https://api.voicerss.org/?${params.toString()}`

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
  // quota dépassé, compte inactif...) avec un statut HTTP 200 — la seule façon fiable de
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
