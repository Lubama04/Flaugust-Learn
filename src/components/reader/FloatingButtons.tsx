import { useState, type ReactNode } from 'react'
import { Bot, MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type PanelKind = 'ai' | 'chat' | null

interface FloatingButtonsProps {
  aiPanel: ReactNode
  chatPanel: ReactNode
}

/**
 * Deux boutons ronds flottants (assistant IA, chat de formation) en bas à droite de l'écran, qui
 * ouvrent chacun un panneau latéral droit (40% desktop, plein écran mobile) plutôt que de prendre
 * de la place dans le contenu.
 */
export function FloatingButtons({ aiPanel, chatPanel }: FloatingButtonsProps) {
  const [active, setActive] = useState<PanelKind>(null)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={() => setActive((a) => (a === 'ai' ? null : 'ai'))}
          aria-label="Assistant IA"
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105',
            active === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-white text-primary'
          )}
        >
          <Bot className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setActive((a) => (a === 'chat' ? null : 'chat'))}
          aria-label="Chat de la formation"
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105',
            active === 'chat' ? 'bg-secondary text-secondary-foreground' : 'bg-white text-secondary'
          )}
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setActive(null)}
            className="absolute inset-0 animate-in fade-in bg-black/40 duration-200 sm:bg-black/20"
          />
          <div className="relative z-10 flex h-full w-full flex-col bg-white shadow-xl animate-in slide-in-from-right duration-250 sm:w-[40%] sm:min-w-[360px]">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-dark">
                {active === 'ai' ? (
                  <>
                    <Bot className="h-4 w-4 text-primary" /> Assistant IA
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 text-secondary" /> Chat de la formation
                  </>
                )}
              </p>
              <button type="button" onClick={() => setActive(null)} aria-label="Fermer" className="text-gray-400 hover:text-dark">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{active === 'ai' ? aiPanel : chatPanel}</div>
          </div>
        </div>
      )}
    </>
  )
}
