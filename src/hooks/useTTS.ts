import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type TTSGender = 'female' | 'male'
type TTSEngine = 'voicerss' | 'webspeech'

const RATE_STORAGE_KEY = 'tts_rate'
const GENDER_STORAGE_KEY = 'tts_gender'

// VoiceRSS (comme la plupart des API TTS à quota) peut refuser ou tronquer les textes trop longs,
// et une session de cours complète dépasse largement une seule requête raisonnable. Le texte est
// donc découpé en morceaux lus séquentiellement plutôt que tronqué silencieusement — y compris
// dans ce hook double moteur, où le morceau qui échoue (et tout ce qui suit) bascule vers Web
// Speech au lieu de relire tout le texte depuis le début.
const MAX_CHUNK_CHARS = 1500

// En dessous de cette taille, la réponse est presque certainement un fragment audio corrompu ou
// vide plutôt qu'une vraie synthèse — traité comme un échec pour déclencher le fallback.
const MIN_AUDIO_BLOB_BYTES = 1000

// WAV silencieux d'un seul échantillon, utilisé uniquement pour "débloquer" la lecture audio sur
// iOS/Safari (voir plus bas).
const SILENT_AUDIO_SRC =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

const FEMALE_VOICE_PATTERN = /female|femme|woman|fiona|amelie|amélie|marie|claire|julie|audrey|hortense/i
const MALE_VOICE_PATTERN = /male|homme|man|thomas|nicolas|pierre|jean|daniel|paul|guillaume|antoine|henri/i

function readStoredRate(): number {
  const stored = localStorage.getItem(RATE_STORAGE_KEY)
  const parsed = stored ? parseFloat(stored) : NaN
  return Number.isFinite(parsed) ? parsed : 1
}

function readStoredGender(): TTSGender {
  return localStorage.getItem(GENDER_STORAGE_KEY) === 'male' ? 'male' : 'female'
}

// Découpe le texte en morceaux d'environ MAX_CHUNK_CHARS caractères sans jamais couper au milieu
// d'une phrase (limite de taille par requête côté edge function/VoiceRSS ; couper au milieu d'un
// mot produirait aussi un silence audible désagréable entre deux morceaux).
function chunkText(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [text]
  const chunks: string[] = []
  let current = ''
  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim()
    if (!sentence) continue
    if (sentence.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      for (let i = 0; i < sentence.length; i += MAX_CHUNK_CHARS) {
        chunks.push(sentence.slice(i, i + MAX_CHUNK_CHARS))
      }
      continue
    }
    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length > MAX_CHUNK_CHARS) {
      chunks.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  return chunks.length > 0 ? chunks : [text]
}

/**
 * Hook Text-to-Speech à double moteur :
 *  1. VoiceRSS (edge function `tts-voicerss`, audio MP3 réel) en priorité.
 *  2. Web Speech API du navigateur en repli automatique et silencieux si VoiceRSS échoue
 *     (réseau, quota, compte VoiceRSS inactif...).
 *
 * Règle absolue : aucune erreur VoiceRSS n'est jamais montrée à l'utilisateur. Un échec
 * bascule silencieusement sur l'autre moteur ; si les deux échouent, l'interface revient
 * simplement à son état initial (bouton "Écouter" réaffiché), sans message.
 *
 * Le texte est découpé en morceaux (voir chunkText) et lus séquentiellement. Si un morceau
 * échoue en VoiceRSS, ce morceau et tous les suivants sont lus via Web Speech plutôt que de
 * relire tout le texte depuis le début (évite de répéter à l'utilisateur ce qu'il a déjà
 * entendu).
 */
export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported] = useState(() => typeof window !== 'undefined' && typeof Audio !== 'undefined')
  const [rate, setRate] = useState(readStoredRate)
  const [gender, setGender] = useState<TTSGender>(readStoredGender)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<string[]>([])
  const chunkIndexRef = useRef(0)
  const blobUrlsRef = useRef<Map<number, string>>(new Map())
  const stoppedRef = useRef(true)
  const rateRef = useRef(rate)
  const genderRef = useRef(gender)
  const engineRef = useRef<TTSEngine | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  rateRef.current = rate
  genderRef.current = gender

  // Précharge la liste des voix Web Speech dès le montage — elle se peuple de façon asynchrone
  // sur la plupart des navigateurs, et le fallback doit pouvoir choisir une voix immédiatement
  // au moment où VoiceRSS échoue, sans nouvelle attente.
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () => {
      const available = window.speechSynthesis.getVoices()
      if (available.length > 0) voicesRef.current = available
    }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    const t1 = setTimeout(load, 500)
    const t2 = setTimeout(load, 1500)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    clearKeepAlive()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    blobUrlsRef.current.clear()
    chunksRef.current = []
    chunkIndexRef.current = 0
    engineRef.current = null
    setIsLoading(false)
    setIsPlaying(false)
    setIsPaused(false)
  }, [clearKeepAlive])

  const getVoice = useCallback((preferredGender: TTSGender): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current
    if (voices.length === 0) return null
    const frVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('fr'))
    const pool = frVoices.length > 0 ? frVoices : voices
    const pattern = preferredGender === 'female' ? FEMALE_VOICE_PATTERN : MALE_VOICE_PATTERN
    return pool.find((v) => pattern.test(v.name)) ?? pool[0] ?? null
  }, [])

  // ── Moteur de repli : Web Speech API ──
  // Prend le texte restant à lire (peut être le texte complet si VoiceRSS a échoué dès le
  // premier morceau, ou seulement la fin si VoiceRSS a fonctionné un moment puis a échoué).
  const speakWithWebSpeech = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window)) {
        // Ni VoiceRSS ni Web Speech disponibles : retour silencieux à l'état initial.
        setIsLoading(false)
        setIsPlaying(false)
        setIsPaused(false)
        engineRef.current = null
        return
      }

      const cleanText = text.replace(/\s+/g, ' ').trim()
      if (!cleanText) {
        setIsLoading(false)
        setIsPlaying(false)
        setIsPaused(false)
        engineRef.current = null
        return
      }

      window.speechSynthesis.cancel()
      engineRef.current = 'webspeech'

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = 'fr-FR'
      utterance.rate = rateRef.current
      utterance.volume = 1
      utterance.pitch = genderRef.current === 'female' ? 1.05 : 0.9
      const voice = getVoice(genderRef.current)
      if (voice) utterance.voice = voice

      utterance.onstart = () => {
        if (stoppedRef.current) return
        setIsLoading(false)
        setIsPlaying(true)
        setIsPaused(false)
      }
      utterance.onend = () => {
        clearKeepAlive()
        if (stoppedRef.current) return
        setIsPlaying(false)
        setIsPaused(false)
        engineRef.current = null
      }
      utterance.onerror = (event) => {
        clearKeepAlive()
        if (stoppedRef.current) return
        // 'interrupted'/'canceled' sont normaux (déclenchés par notre propre cancel() ou un
        // stop() utilisateur) — jamais remonté à l'utilisateur dans tous les cas, conformément
        // à la règle « pas de message d'erreur TTS visible ».
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.info('TTS: Web Speech API indisponible également, arrêt silencieux.')
        }
        setIsLoading(false)
        setIsPlaying(false)
        setIsPaused(false)
        engineRef.current = null
      }

      stoppedRef.current = false
      window.speechSynthesis.speak(utterance)

      // Bug Chrome connu : speechSynthesis se coupe silencieusement après ~15s sur les lectures
      // longues. Un pause()/resume() périodique réinitialise le minuteur interne du moteur.
      clearKeepAlive()
      keepAliveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearKeepAlive()
          return
        }
        if (!window.speechSynthesis.paused) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }, 10_000)
    },
    [getVoice, clearKeepAlive]
  )

  const fetchChunkBlobUrl = useCallback(async (text: string): Promise<string> => {
    const { data, error: fnError } = await supabase.functions.invoke('tts-voicerss', {
      body: { text, gender: genderRef.current },
    })
    if (fnError) throw fnError
    if (!(data instanceof Blob)) throw new Error('Réponse audio invalide')
    if (data.size < MIN_AUDIO_BLOB_BYTES) throw new Error('Audio VoiceRSS trop court')
    return URL.createObjectURL(data)
  }, [])

  // ── Moteur principal : VoiceRSS, morceau par morceau ──
  // Sur tout échec (réseau, quota, compte VoiceRSS inactif, blob invalide, lecture bloquée), le
  // morceau courant et tous les suivants basculent sur Web Speech au lieu de faire échouer toute
  // la lecture — jamais de message d'erreur, juste un changement de moteur.
  const playFromVoiceRSS = useCallback(
    async (index: number) => {
      if (stoppedRef.current) return
      const chunks = chunksRef.current
      const audio = audioRef.current
      if (!audio) return

      if (index >= chunks.length) {
        // Lecture VoiceRSS terminée naturellement.
        stop()
        return
      }
      chunkIndexRef.current = index

      const fallbackToWebSpeech = () => {
        if (stoppedRef.current) return
        console.info('TTS: VoiceRSS indisponible, bascule automatique vers Web Speech API.')
        const remaining = chunksRef.current.slice(index).join(' ')
        blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
        blobUrlsRef.current.clear()
        speakWithWebSpeech(remaining)
      }

      const currentChunk = chunks[index]
      if (currentChunk === undefined) return

      let url = blobUrlsRef.current.get(index)
      if (!url) {
        setIsLoading(true)
        try {
          url = await fetchChunkBlobUrl(currentChunk)
        } catch {
          fallbackToWebSpeech()
          return
        }
        if (stoppedRef.current) return
        blobUrlsRef.current.set(index, url)
      }

      audio.src = url
      audio.currentTime = 0
      audio.playbackRate = rateRef.current
      audio.onended = () => {
        if (stoppedRef.current || engineRef.current !== 'voicerss') return
        void playFromVoiceRSS(chunkIndexRef.current + 1)
      }
      try {
        await audio.play()
      } catch {
        fallbackToWebSpeech()
        return
      }
      if (stoppedRef.current) return
      setIsLoading(false)
      setIsPlaying(true)
      setIsPaused(false)

      // Précharge le morceau suivant pendant la lecture du morceau courant. Échec silencieux :
      // une nouvelle tentative (avec bascule si nécessaire) aura lieu au moment de la lecture
      // réelle de ce morceau, dans le bloc ci-dessus.
      const nextIndex = index + 1
      const nextChunk = chunks[nextIndex]
      if (nextChunk !== undefined && !blobUrlsRef.current.has(nextIndex)) {
        fetchChunkBlobUrl(nextChunk)
          .then((nextUrl) => {
            if (!stoppedRef.current) blobUrlsRef.current.set(nextIndex, nextUrl)
          })
          .catch(() => {})
      }
    },
    [stop, fetchChunkBlobUrl, speakWithWebSpeech]
  )

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return
      const cleanText = text.replace(/\s+/g, ' ').trim()
      if (!cleanText) return

      stop()
      stoppedRef.current = false
      setIsLoading(true)
      engineRef.current = 'voicerss'
      chunksRef.current = chunkText(cleanText)
      chunkIndexRef.current = 0

      if (!audioRef.current) audioRef.current = new Audio()
      const audio = audioRef.current
      audio.playbackRate = rateRef.current

      // Pas de handler onended tant que le vrai premier morceau n'a pas démarré : le clip
      // silencieux ci-dessous déclenche son propre 'ended' quasi immédiatement (avant même que
      // le fetch VoiceRSS ait une chance d'aboutir), et le confondre avec la fin d'un vrai
      // morceau avançait — voire arrêtait — la lecture avant qu'elle ait commencé. Le vrai
      // handler n'est posé que juste avant chaque audio.play() réel, dans playFromVoiceRSS.
      audio.onended = null

      // Débloque la lecture audio sur iOS/Safari : le premier play() doit survenir de façon
      // synchrone dans le gestionnaire de clic. Jouer un silence immédiatement associe cet
      // élément <audio> au geste utilisateur, ce qui autorise les appels .play() suivants
      // (déclenchés de façon asynchrone une fois le MP3 récupéré) sur ce même élément.
      audio.src = SILENT_AUDIO_SRC
      void audio.play().catch(() => {})

      // Amorce Web Speech de façon synchrone dans le même geste utilisateur (meilleur effort,
      // non garanti sur toutes les versions iOS) : si VoiceRSS échoue, le speak() de repli est
      // appelé de façon asynchrone et pourrait sinon être bloqué par la même règle de geste
      // utilisateur qui protège la lecture audio.
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const primer = new SpeechSynthesisUtterance(' ')
        primer.volume = 0
        window.speechSynthesis.speak(primer)
      }

      void playFromVoiceRSS(0)
    },
    [isSupported, stop, playFromVoiceRSS]
  )

  const pause = useCallback(() => {
    if (engineRef.current === 'voicerss' && audioRef.current && isPlaying) {
      audioRef.current.pause()
      setIsPaused(true)
      setIsPlaying(false)
    } else if (engineRef.current === 'webspeech' && isPlaying) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }, [isPlaying])

  const resume = useCallback(() => {
    if (engineRef.current === 'voicerss' && audioRef.current && isPaused) {
      void audioRef.current.play().catch(() => {})
      setIsPaused(false)
      setIsPlaying(true)
    } else if (engineRef.current === 'webspeech' && isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
    }
  }, [isPaused])

  const changeRate = useCallback((newRate: number) => {
    setRate(newRate)
    rateRef.current = newRate
    localStorage.setItem(RATE_STORAGE_KEY, String(newRate))
    // playbackRate d'un élément <audio> peut être changé en direct sans interrompre la lecture ;
    // Web Speech ne le permet pas (le CDC de la version précédente l'a déjà établi), on ne
    // redémarre donc que si le moteur actif est Web Speech.
    if (audioRef.current) audioRef.current.playbackRate = newRate
  }, [])

  const changeGender = useCallback(
    (newGender: TTSGender) => {
      setGender(newGender)
      genderRef.current = newGender
      localStorage.setItem(GENDER_STORAGE_KEY, newGender)
      // Les morceaux VoiceRSS déjà générés/en cache et l'utterance Web Speech en cours
      // correspondent à l'ancienne voix : la lecture en cours est interrompue.
      stop()
    },
    [stop]
  )

  useEffect(() => {
    return () => {
      stoppedRef.current = true
      clearKeepAlive()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      audioRef.current?.pause()
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [clearKeepAlive])

  return {
    isPlaying,
    isPaused,
    isLoading,
    isSupported,
    rate,
    gender,
    speak,
    pause,
    resume,
    stop,
    changeRate,
    changeGender,
  }
}
