import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { useAIAssistant } from '@/hooks/useAIAssistant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const MAX_EXCHANGES_PER_SESSION = 10

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

interface AIAssistantPanelProps {
  sessionTitle: string
  courseTitle: string
  sessionContent: string
}

export function AIAssistantPanel({ sessionTitle, courseTitle, sessionContent }: AIAssistantPanelProps) {
  const { ask, isLoading } = useAIAssistant()
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Bonjour ! Je suis votre assistant pour cette session. Posez-moi vos questions !' },
  ])
  const [input, setInput] = useState('')
  const [exchangeCount, setExchangeCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const exhausted = exchangeCount >= MAX_EXCHANGES_PER_SESSION

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async (question: string) => {
    if (!question.trim() || exhausted || isLoading) return
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setExchangeCount((c) => c + 1)
    try {
      const result = await ask('assistant_question', {
        question,
        session_content: sessionContent,
        session_title: sessionTitle,
        course_title: courseTitle,
      })
      setMessages((prev) => [...prev, { role: 'assistant', text: result }])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'appel à l'assistant"
      setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${message}` }])
    }
  }

  const handleSummarize = () => {
    void send(`Résume cette session : ${sessionTitle}`)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 border-b border-gray-100 bg-primary/5 px-4 py-3 text-left"
      >
        <Bot className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-dark">Assistant FlaugustLearn</p>
          <p className="text-[11px] text-gray-400">Propulsé par Gemini</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="flex flex-col">
          <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                  m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-lightGray text-dark'
                )}
              >
                {m.text}
              </div>
            ))}
            {isLoading && <p className="text-xs italic text-gray-400">En train de répondre…</p>}
          </div>

          <div className="border-t border-gray-100 p-3">
            {exhausted ? (
              <p className="text-xs text-gray-400">
                Limite de {MAX_EXCHANGES_PER_SESSION} questions atteinte pour cette session.
              </p>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send(input)}
                    placeholder="Votre question…"
                    disabled={isLoading}
                  />
                  <Button size="icon" onClick={() => send(input)} disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-xs" onClick={handleSummarize} disabled={isLoading}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Résumer cette session
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
