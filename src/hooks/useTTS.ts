import { useState, useCallback, useRef, useEffect } from 'react'

export type TTSGender = 'female' | 'male'

interface TTSOptions {
  lang?: string
  onBoundary?: (charIndex: number) => void
}

const RATE_STORAGE_KEY = 'tts_rate'
const GENDER_STORAGE_KEY = 'tts_gender'
// Bug Chrome connu et non corrigé depuis des années : speechSynthesis se coupe silencieusement
// après ~15s sur les lectures longues. Un pause()/resume() périodique pendant la lecture
// réinitialise le minuteur interne du moteur, sans effet audible pour l'utilisateur.
const CHROME_KEEPALIVE_MS = 10_000
// Repli par sondage pour les navigateurs (notamment certains WebView Android) qui ne déclenchent
// jamais 'voiceschanged' de façon fiable.
const VOICE_POLL_MS = 300
const VOICE_POLL_TIMEOUT_MS = 3000

function readStoredRate(): number {
  const stored = localStorage.getItem(RATE_STORAGE_KEY)
  const parsed = stored ? parseFloat(stored) : NaN
  return Number.isFinite(parsed) ? parsed : 1
}

function readStoredGender(): TTSGender {
  return localStorage.getItem(GENDER_STORAGE_KEY) === 'male' ? 'male' : 'female'
}

const FEMALE_VOICE_PATTERN = /female|femme|woman|fiona|amelie|amélie|marie|claire|julie|audrey|hortense/i
const MALE_VOICE_PATTERN = /male|homme|man|thomas|nicolas|pierre|jean|daniel|paul|guillaume|antoine|henri/i

/**
 * Hook Text-to-Speech basé sur la Web Speech API du navigateur.
 *
 * Cause du bug "aucun son sur aucun appareil" : sur la plupart des navigateurs (Chrome, Safari,
 * la majorité des Android), la liste des voix (speechSynthesis.getVoices()) est peuplée de façon
 * asynchrone après le chargement de la page. La version précédente rappelait getVoices() à
 * l'intérieur même de speak(), sans jamais attendre cette initialisation : un premier clic sur
 * "Écouter" (le cas le plus courant) obtenait alors utterance.voice non défini ou lié à une voix
 * pas encore réellement initialisée côté moteur. Dans cet état, le moteur avance quand même dans
 * le cycle de vie de la lecture (onstart, onboundary, onend se déclenchent normalement — d'où
 * l'illusion d'une lecture qui progresse) mais ne produit aucun son. La liste des voix est
 * désormais chargée une fois via voiceschanged + sondage de repli, et mise en cache.
 */
export function useTTS(options: TTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [rate, setRate] = useState(readStoredRate)
  const [gender, setGender] = useState<TTSGender>(readStoredGender)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setIsSupported(true)

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices()
      if (available.length > 0) setVoices(available)
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    const pollId = setInterval(loadVoices, VOICE_POLL_MS)
    const pollTimeout = setTimeout(() => clearInterval(pollId), VOICE_POLL_TIMEOUT_MS)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      clearInterval(pollId)
      clearTimeout(pollTimeout)
    }
  }, [])

  const getVoice = useCallback(
    (preferredGender: TTSGender): SpeechSynthesisVoice | null => {
      if (voices.length === 0) return null
      const frVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('fr'))
      // À défaut de voix française installée sur l'appareil, mieux vaut une voix dans une autre
      // langue que pas de voix du tout (utterance.voice non défini a précisément causé le bug).
      const pool = frVoices.length > 0 ? frVoices : voices
      const pattern = preferredGender === 'female' ? FEMALE_VOICE_PATTERN : MALE_VOICE_PATTERN
      return pool.find((v) => pattern.test(v.name)) ?? pool[0] ?? null
    },
    [voices]
  )

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    utteranceRef.current = null
  }, [])

  // speak() reste entièrement synchrone (aucun await/setTimeout/Promise avant l'appel à
  // window.speechSynthesis.speak()) : sur iOS/Safari, tout appel asynchrone intercalé entre le
  // geste utilisateur et speak() empêche la lecture.
  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return
      const cleanText = text.replace(/\s+/g, ' ').trim()
      if (!cleanText) return

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = optionsRef.current.lang ?? 'fr-FR'
      utterance.rate = rate
      utterance.volume = 1
      utterance.pitch = gender === 'female' ? 1.05 : 0.9
      const voice = getVoice(gender)
      if (voice) utterance.voice = voice

      utterance.onboundary = (event) => {
        optionsRef.current.onBoundary?.(event.charIndex)
      }
      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
      }
      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
        utteranceRef.current = null
      }
      utterance.onerror = (event) => {
        // 'interrupted'/'canceled' sont normaux (déclenchés par notre propre cancel() ci-dessus
        // ou par un stop() utilisateur) : pas une vraie erreur à traiter différemment.
        void event
        setIsPlaying(false)
        setIsPaused(false)
        utteranceRef.current = null
      }

      // Conserver une référence forte à l'utterance : sans elle, certains Chrome la
      // garbage-collectent et coupent la synthèse en cours.
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
      // Retour visuel immédiat ; onend/onerror corrigent l'état si la lecture ne démarre pas.
      setIsPlaying(true)
      setIsPaused(false)
    },
    [isSupported, rate, gender, getVoice]
  )

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }, [])

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
    }
  }, [])

  const changeRate = useCallback(
    (newRate: number) => {
      setRate(newRate)
      localStorage.setItem(RATE_STORAGE_KEY, String(newRate))
      if (isPlaying || isPaused) stop()
    },
    [isPlaying, isPaused, stop]
  )

  const changeGender = useCallback(
    (newGender: TTSGender) => {
      setGender(newGender)
      localStorage.setItem(GENDER_STORAGE_KEY, newGender)
      if (isPlaying || isPaused) stop()
    },
    [isPlaying, isPaused, stop]
  )

  // Palliatif au bug Chrome des lectures longues coupées en silence (voir CHROME_KEEPALIVE_MS).
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, CHROME_KEEPALIVE_MS)
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => () => window.speechSynthesis.cancel(), [])

  return {
    isPlaying,
    isPaused,
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
