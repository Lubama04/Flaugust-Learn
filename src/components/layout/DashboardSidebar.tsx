import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SidebarLink {
  to: string
  label: string
  icon: LucideIcon
}

interface DashboardSidebarProps {
  links: SidebarLink[]
  roleLabel: string
}

/** Barre latérale partagée par les layouts protégés (apprenant / formateur / admin). */
export function DashboardSidebar({ links, roleLabel }: DashboardSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-100 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6 font-display text-lg font-bold text-primary">
        <GraduationCap className="h-6 w-6" aria-hidden="true" />
        FlaugustLearn
      </div>
      <div className="px-6 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {roleLabel}
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray hover:bg-lightGray hover:text-primary'
            )}
            activeProps={{ className: 'bg-primary/10 text-primary' }}
            activeOptions={{ exact: true }}
          >
            <link.icon className="h-4 w-4" aria-hidden="true" />
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
