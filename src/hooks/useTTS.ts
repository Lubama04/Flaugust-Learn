import { useState, useCallback, useRef, useEffect } from 'react'

interface TTSOptions {
  lang?: string
  onBoundary?: (charIndex: number) => void
}

const RATE_STORAGE_KEY = 'tts_rate'

function readStoredRate(): number {
  const stored = localStorage.getItem(RATE_STORAGE_KEY)
  const parsed = stored ? parseFloat(stored) : NaN
  return Number.isFinite(parsed) ? parsed : 1
}

/** Hook Text-to-Speech basé sur la Web Speech API du navigateur. */
export function useTTS(options: TTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [rate, setRate] = useState(readStoredRate)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    setIsSupported('speechSynthesis' in window)
  }, [])

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices()
    return (
      voices.find((v) => v.lang.startsWith('fr')) ??
      voices.find((v) => v.lang.startsWith('en')) ??
      voices[0] ??
      null
    )
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = optionsRef.current.lang ?? 'fr-FR'
      utterance.rate = rate
      const voice = getVoice()
      if (voice) utterance.voice = voice

      utterance.onboundary = (event) => {
        optionsRef.current.onBoundary?.(event.charIndex)
      }
      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
      }
      utterance.onerror = () => {
        setIsPlaying(false)
        setIsPaused(false)
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
      setIsPlaying(true)
      setIsPaused(false)
    },
    [isSupported, rate, getVoice]
  )

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    setIsPaused(true)
    setIsPlaying(false)
  }, [])

  const resume = useCallback(() => {
    window.speechSynthesis.resume()
    setIsPaused(false)
    setIsPlaying(true)
  }, [])

  const changeRate = useCallback(
    (newRate: number) => {
      setRate(newRate)
      localStorage.setItem(RATE_STORAGE_KEY, String(newRate))
      if (isPlaying || isPaused) stop()
    },
    [isPlaying, isPaused, stop]
  )

  useEffect(() => () => window.speechSynthesis.cancel(), [])

  return { isPlaying, isPaused, isSupported, rate, speak, pause, resume, stop, changeRate }
}
