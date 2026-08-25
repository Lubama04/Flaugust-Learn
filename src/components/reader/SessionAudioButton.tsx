import { useState } from 'react'
import { Volume2, Pause, Play, Square, Loader2, ChevronDown } from 'lucide-react'
import { useTTS } from '@/hooks/useTTS'
import { cn } from '@/lib/utils'

interface SessionAudioButtonProps {
  text: string
}

const RATES = [0.75, 1, 1.25, 1.5]

/** Bouton audio discret (icône seule) dans l'en-tête du lecteur, réglages repliés par défaut. */
export function SessionAudioButton({ text }: SessionAudioButtonProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { isPlaying, isPaused, isLoading, isSupported, rate, gender, speak, pause, resume, stop, changeRate, changeGender } =
    useTTS()

  if (!isSupported) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (isPlaying) pause()
          else if (isPaused) resume()
          else speak(text)
        }}
        disabled={isLoading}
        aria-label={isPlaying ? 'Mettre en pause la lecture audio' : 'Écouter cette session'}
        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-lightGray hover:text-primary"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : isPaused ? (
          <Play className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      {(isPlaying || isPaused) && (
        <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray hover:bg-lightGray"
            >
              <Square className="h-3.5 w-3.5" /> Arrêter
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray hover:bg-lightGray"
            >
              Réglages <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', settingsOpen && 'rotate-180')} />
            </button>
          </div>

          {settingsOpen && (
            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => changeGender('female')}
                  className={cn(
                    'flex-1 rounded-full border px-2 py-1 text-xs font-medium',
                    gender === 'female' ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-200 text-gray'
                  )}
                >
                  👩 Féminine
                </button>
                <button
                  type="button"
                  onClick={() => changeGender('male')}
                  className={cn(
                    'flex-1 rounded-full border px-2 py-1 text-xs font-medium',
                    gender === 'male' ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-200 text-gray'
                  )}
                >
                  👨 Masculine
                </button>
              </div>
              <div className="flex items-center gap-1">
                {RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => changeRate(r)}
                    className={cn(
                      'flex-1 rounded-md py-1 text-xs font-medium',
                      rate === r ? 'bg-primary text-primary-foreground' : 'text-gray hover:bg-lightGray'
                    )}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
