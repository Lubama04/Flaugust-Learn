import { CheckCircle2, Circle, Lock, PlayCircle, FileText, Video, Music, FileType, Presentation, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Module, CourseSession } from '@/types'

const SESSION_ICONS: Record<string, typeof FileText> = {
  texte: FileText,
  video: Video,
  audio: Music,
  pdf: FileType,
  slides: Presentation,
  live: Radio,
}

export interface ModuleWithSessions extends Module {
  sessions: CourseSession[]
}

interface CourseSidebarProps {
  modules: ModuleWithSessions[]
  activeSessionId: string | null
  completedSessionIds: Set<string>
  onSelectSession: (session: CourseSession) => void
}

export function CourseSidebar({ modules, activeSessionId, completedSessionIds, onSelectSession }: CourseSidebarProps) {
  return (
    <nav className="space-y-4">
      {modules.map((module) => (
        <div key={module.id}>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {module.is_free_preview && <PlayCircle className="h-3.5 w-3.5 text-secondary" />}
            {module.title}
          </p>
          <div className="space-y-1">
            {module.sessions.map((session) => {
              const Icon = SESSION_ICONS[session.type] ?? FileText
              const isCompleted = completedSessionIds.has(session.id)
              const isActive = session.id === activeSessionId
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelectSession(session)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                    isActive ? 'bg-primary/10 text-primary' : 'text-gray hover:bg-lightGray'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-lime" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                  )}
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{session.title}</span>
                  {!session.is_free_preview && !isCompleted && (
                    <Lock className="h-3 w-3 shrink-0 text-gray-300" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
