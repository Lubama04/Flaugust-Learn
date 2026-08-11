import type { ReactNode } from 'react'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

interface CourseReaderProps {
  title: string
  progressLabel: string
  sidebar: ReactNode
  notes?: ReactNode
  children: ReactNode
  headerAction?: ReactNode
}

/**
 * Layout 3 colonnes du lecteur : sidebar (navigation + progression) / contenu / notes.
 * Sur mobile, la sidebar devient un accordéon repliable au-dessus du contenu.
 */
export function CourseReader({ title, progressLabel, sidebar, notes, children, headerAction }: CourseReaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-lightGray/40">
      <header className="flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4">
        <button
          type="button"
          className="text-gray-400 md:hidden"
          onClick={() => setMobileNavOpen((o) => !o)}
          aria-label="Basculer la navigation"
        >
          {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-dark">{title}</p>
          <p className="text-xs text-gray-400">{progressLabel}</p>
        </div>
        {headerAction}
      </header>

      {mobileNavOpen && (
        <div className="border-b border-gray-100 bg-white p-4 md:hidden">{sidebar}</div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-6">{sidebar}</div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>

        {notes && <aside className="hidden w-72 shrink-0 lg:block">{notes}</aside>}
      </div>
    </div>
  )
}
