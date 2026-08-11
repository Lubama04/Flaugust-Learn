import { useCallback, useRef, useState } from 'react'

const MAX_RECORDING_MS = 3 * 60 * 1000 // 3 minutes — largement suffisant pour un message vocal de chat.

/** Enregistrement audio navigateur (MediaRecorder) pour les messages vocaux du chat. */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsRecording(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      timeoutRef.current = setTimeout(stop, MAX_RECORDING_MS)
    } catch {
      setError("Impossible d'accéder au microphone")
    }
  }, [stop])

  const reset = useCallback(() => {
    setAudioBlob(null)
    setError(null)
  }, [])

  return { isRecording, audioBlob, error, start, stop, reset }
}
