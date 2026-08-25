import { CheckCircle2, Circle, Lock, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Module, CourseSession } from '@/types'

export interface ModuleWithSessions extends Module {
  sessions: CourseSession[]
}

export interface ActiveSessionSubItem {
  title: string
  state: 'done' | 'current' | 'todo'
}

interface CourseSidebarProps {
  modules: ModuleWithSessions[]
  activeSessionId: string | null
  completedSessionIds: Set<string>
  onSelectSession: (session: CourseSession) => void
  /** Sous-étapes (sections + quiz) de la session active, affichées imbriquées sous celle-ci. */
  activeSessionSubItems?: ActiveSessionSubItem[]
  /** Sessions dont la fiche interactive a été ouverte puis fermée sans être marquée terminée. */
  worksheetInProgressSessionIds?: Set<string>
}

/** Arbre modules → sessions du plan de formation, utilisé à l'intérieur de CoursePlanOverlay. */
export function CourseSidebar({
  modules,
  activeSessionId,
  completedSessionIds,
  onSelectSession,
  activeSessionSubItems,
  worksheetInProgressSessionIds,
}: CourseSidebarProps) {
  return (
    <nav className="space-y-5">
      {modules.map((module) => (
        <div key={module.id}>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {module.is_free_preview && <PlayCircle className="h-3.5 w-3.5 text-secondary" />}
            {module.title}
          </p>
          <div className="space-y-1">
            {module.sessions.map((session) => {
              const isCompleted = completedSessionIds.has(session.id)
              const isActive = session.id === activeSessionId
              const isLocked = !session.is_free_preview && !isCompleted && !isActive
              const status = isCompleted ? 'done' : isActive ? 'current' : isLocked ? 'locked' : 'todo'

              return (
                <div key={session.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSession(session)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-gray hover:bg-lightGray'
                    )}
                  >
                    {status === 'done' && <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" />}
                    {status === 'current' && <span className="text-base leading-none">🔵</span>}
                    {status === 'locked' && <Lock className="h-4 w-4 shrink-0 text-gray-300" />}
                    {status === 'todo' && <Circle className="h-4 w-4 shrink-0 text-gray-300" />}
                    <span className="flex-1 truncate">{session.title}</span>
                    {worksheetInProgressSessionIds?.has(session.id) && (
                      <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Fiche en cours
                      </span>
                    )}
                  </button>

                  {isActive && activeSessionSubItems && activeSessionSubItems.length > 0 && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l border-gray-100 pl-3">
                      {activeSessionSubItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 py-1 text-xs text-gray">
                          <span className="leading-none">{item.state === 'done' ? '✅' : item.state === 'current' ? '🔵' : '🔒'}</span>
                          <span className={cn('truncate', item.state === 'current' && 'font-medium text-dark')}>{item.title}</span>
                          {item.state === 'current' && <span className="text-[10px] text-gray-400">(en cours)</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
