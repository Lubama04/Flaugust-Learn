import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type TTSGender = 'female' | 'male'

const RATE_STORAGE_KEY = 'tts_rate'
const GENDER_STORAGE_KEY = 'tts_gender'

// VoiceRSS (comme la plupart des API TTS à quota) peut refuser ou tronquer les textes trop longs,
// et une session de cours complète dépasse largement une seule requête raisonnable. Le texte est
// donc découpé en morceaux lus séquentiellement plutôt que tronqué silencieusement.
const MAX_CHUNK_CHARS = 1500

// WAV silencieux d'un seul échantillon, utilisé uniquement pour "débloquer" la lecture audio sur
// iOS/Safari (voir plus bas).
const SILENT_AUDIO_SRC =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

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
      // Phrase à elle seule plus longue que la limite : découpage brut en dernier recours.
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
 * Hook Text-to-Speech basé sur VoiceRSS (API tierce, MP3 réel) au lieu de la Web Speech API du
 * navigateur, qui ne produisait aucun son sur Chrome (politique audio bloquant la synthèse).
 * L'edge function `tts-voicerss` proxifie l'appel (clé VoiceRSS gardée côté serveur) et renvoie
 * un flux audio/mpeg ; ce hook le convertit en Blob URL et le joue via un élément <audio> natif.
 *
 * Le texte est découpé en morceaux (voir chunkText) et lus séquentiellement sur un seul élément
 * <audio> réutilisé d'un morceau à l'autre — réutiliser le même élément (plutôt que d'en créer un
 * par morceau) est ce qui permet à Safari/iOS d'autoriser les lectures suivantes déclenchées de
 * façon asynchrone après la première, initiée de façon synchrone dans le geste utilisateur.
 *
 * Le suivi mot-par-mot (onBoundary) de l'ancienne implémentation Web Speech API n'a pas
 * d'équivalent avec un MP3 pré-rendu (aucun événement de limite de mot) : il est remplacé côté
 * TexteCard par une simple pulsation visuelle pendant la lecture.
 */
export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported] = useState(() => typeof window !== 'undefined' && typeof Audio !== 'undefined')
  const [rate, setRate] = useState(readStoredRate)
  const [gender, setGender] = useState<TTSGender>(readStoredGender)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<string[]>([])
  const chunkIndexRef = useRef(0)
  const blobUrlsRef = useRef<Map<number, string>>(new Map())
  const stoppedRef = useRef(true)
  const rateRef = useRef(rate)
  const genderRef = useRef(gender)
  rateRef.current = rate
  genderRef.current = gender

  const stop = useCallback(() => {
    stoppedRef.current = true
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    blobUrlsRef.current.clear()
    chunksRef.current = []
    chunkIndexRef.current = 0
    setIsLoading(false)
    setIsPlaying(false)
    setIsPaused(false)
  }, [])

  const fetchChunkBlobUrl = useCallback(async (text: string): Promise<string> => {
    const { data, error: fnError } = await supabase.functions.invoke('tts-voicerss', {
      body: { text, gender: genderRef.current },
    })
    if (fnError) {
      let message = 'Erreur lors de la génération audio'
      const context = (fnError as { context?: Response }).context
      if (context) {
        try {
          const body = (await context.clone().json()) as { error?: string }
          if (body?.error) message = body.error
        } catch {
          // Réponse d'erreur non-JSON : on garde le message générique.
        }
      }
      throw new Error(message)
    }
    if (!(data instanceof Blob)) throw new Error('Réponse audio invalide')
    return URL.createObjectURL(data)
  }, [])

  const playFrom = useCallback(
    async (index: number) => {
      if (stoppedRef.current) return
      const chunks = chunksRef.current
      const audio = audioRef.current
      if (!audio) return

      if (index >= chunks.length) {
        // Lecture terminée naturellement (dernier morceau joué en entier).
        stop()
        return
      }
      chunkIndexRef.current = index

      const currentChunk = chunks[index]
      if (currentChunk === undefined) return

      let url = blobUrlsRef.current.get(index)
      if (!url) {
        setIsLoading(true)
        try {
          url = await fetchChunkBlobUrl(currentChunk)
        } catch (err) {
          if (stoppedRef.current) return
          setError(err instanceof Error ? err.message : 'Erreur lors de la génération audio')
          setIsLoading(false)
          setIsPlaying(false)
          setIsPaused(false)
          return
        }
        if (stoppedRef.current) return
        blobUrlsRef.current.set(index, url)
      }

      audio.src = url
      audio.currentTime = 0
      audio.playbackRate = rateRef.current
      try {
        await audio.play()
      } catch (err) {
        if (stoppedRef.current) return
        setError(err instanceof Error ? err.message : 'Lecture audio bloquée par le navigateur')
        setIsLoading(false)
        setIsPlaying(false)
        setIsPaused(false)
        return
      }
      if (stoppedRef.current) return
      setIsLoading(false)
      setIsPlaying(true)
      setIsPaused(false)

      // Précharge le morceau suivant pendant la lecture du morceau courant, pour limiter le
      // silence entre deux morceaux. Échec silencieux : une nouvelle tentative aura lieu au
      // moment de la lecture réelle de ce morceau, dans le bloc ci-dessus.
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
    [stop, fetchChunkBlobUrl]
  )

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return
      const cleanText = text.replace(/\s+/g, ' ').trim()
      if (!cleanText) return

      stop()
      stoppedRef.current = false
      setError(null)
      chunksRef.current = chunkText(cleanText)
      chunkIndexRef.current = 0

      if (!audioRef.current) {
        const audio = new Audio()
        audio.onended = () => {
          if (stoppedRef.current) return
          void playFrom(chunkIndexRef.current + 1)
        }
        audio.onerror = () => {
          if (stoppedRef.current) return
          setError('Erreur de lecture audio')
          setIsLoading(false)
          setIsPlaying(false)
          setIsPaused(false)
        }
        audioRef.current = audio
      }
      const audio = audioRef.current
      audio.playbackRate = rateRef.current

      // Débloque la lecture audio sur iOS/Safari : le premier play() doit survenir de façon
      // synchrone dans le gestionnaire de clic. Jouer un silence immédiatement associe cet
      // élément <audio> au geste utilisateur, ce qui autorise les appels .play() suivants
      // (déclenchés de façon asynchrone une fois le MP3 récupéré, puis à chaque morceau
      // suivant depuis onended) sur ce même élément.
      audio.src = SILENT_AUDIO_SRC
      void audio.play().catch(() => {})

      void playFrom(0)
    },
    [isSupported, stop, playFrom]
  )

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (audio && isPlaying) {
      audio.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }, [isPlaying])

  const resume = useCallback(() => {
    const audio = audioRef.current
    if (audio && isPaused) {
      void audio.play().catch(() => {
        setError('Lecture audio bloquée par le navigateur')
      })
      setIsPaused(false)
      setIsPlaying(true)
    }
  }, [isPaused])

  const changeRate = useCallback((newRate: number) => {
    setRate(newRate)
    rateRef.current = newRate
    localStorage.setItem(RATE_STORAGE_KEY, String(newRate))
    // Contrairement à la Web Speech API, playbackRate d'un élément <audio> peut être changé en
    // direct sans interrompre la lecture en cours.
    if (audioRef.current) audioRef.current.playbackRate = newRate
  }, [])

  const changeGender = useCallback(
    (newGender: TTSGender) => {
      setGender(newGender)
      genderRef.current = newGender
      localStorage.setItem(GENDER_STORAGE_KEY, newGender)
      // Les morceaux déjà générés/en cache correspondent à l'ancienne voix : on ne peut pas les
      // réutiliser, la lecture en cours est interrompue (même comportement que l'ancien hook Web
      // Speech API, qui stoppait déjà la lecture sur un changement de voix).
      stop()
    },
    [stop]
  )

  useEffect(() => {
    return () => {
      stoppedRef.current = true
      audioRef.current?.pause()
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  return {
    isPlaying,
    isPaused,
    isLoading,
    isSupported,
    rate,
    gender,
    error,
    speak,
    pause,
    resume,
    stop,
    changeRate,
    changeGender,
  }
}
