import { Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ClipboardCheck, Bot, BarChart3, FileCheck2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { DashboardSidebar, type SidebarLink } from '@/components/layout/DashboardSidebar'
import { Navbar } from '@/components/layout/Navbar'

const LINKS: SidebarLink[] = [
  { to: '/formateur', label: 'Mes formations', icon: LayoutDashboard },
  { to: '/formateur/inscriptions', label: 'Inscriptions', icon: ClipboardCheck },
  { to: '/formateur/soumissions', label: 'Soumissions', icon: FileCheck2 },
  { to: '/formateur/suivi', label: '📊 Suivi apprenants', icon: BarChart3 },
  { to: '/formateur/assistant-ia', label: 'Assistant IA', icon: Bot },
]

export function FormateurLayout() {
  const userId = useAuthStore((s) => s.session?.user.id)
  // Soumissions à réviser (soumises sans validation, ou rejetées par l'IA) pour la pastille rouge.
  const { data: pending } = useQuery({
    queryKey: ['pending-submissions-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('exercise_submissions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['soumis', 'rejete'])
      return count ?? 0
    },
    enabled: !!userId,
    refetchInterval: 60_000,
    retry: false,
  })
  const links = LINKS.map((l) => (l.to === '/formateur/soumissions' ? { ...l, badge: pending ?? 0 } : l))

  return (
    <ProtectedRoute allowedRoles={['formateur', 'admin']}>
      <div className="flex min-h-screen flex-col">
        <Navbar dashboardLinks={links} />
        <div className="flex flex-1">
          <DashboardSidebar links={links} roleLabel="Espace formateur" />
          <main className="flex-1 bg-lightGray/50 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
