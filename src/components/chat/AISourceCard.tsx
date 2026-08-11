import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import type { AiChatSource } from '@/types'

interface AISourceCardProps {
  sources: AiChatSource[]
}

/** Citations affichées sous une réponse IA : titre de la ressource + extrait dépliable. */
export function AISourceCard({ sources }: AISourceCardProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  if (sources.length === 0) return null

  return (
    <div className="mt-2 space-y-1.5 border-t border-secondary/10 pt-2">
      {sources.map((source) => (
        <div key={source.resource_id} className="text-xs">
          <button
            type="button"
            onClick={() => setOpenId((id) => (id === source.resource_id ? null : source.resource_id))}
            className="flex items-center gap-1.5 font-medium text-secondary hover:underline"
          >
            <BookOpen className="h-3 w-3" />
            {source.title}
            {openId === source.resource_id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {openId === source.resource_id && (
            <p className="mt-1 rounded-md bg-secondary/5 p-2 text-gray-500">{source.excerpt.slice(0, 400)}…</p>
          )}
        </div>
      ))}
    </div>
  )
}
