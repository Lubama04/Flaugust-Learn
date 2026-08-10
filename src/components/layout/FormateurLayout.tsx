import { Outlet } from '@tanstack/react-router'
import { LayoutDashboard, ClipboardCheck } from 'lucide-react'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { DashboardSidebar, type SidebarLink } from '@/components/layout/DashboardSidebar'
import { Navbar } from '@/components/layout/Navbar'

const LINKS: SidebarLink[] = [
  { to: '/formateur', label: 'Mes formations', icon: LayoutDashboard },
  { to: '/formateur/inscriptions', label: 'Inscriptions', icon: ClipboardCheck },
]

export function FormateurLayout() {
  return (
    <ProtectedRoute allowedRoles={['formateur', 'admin']}>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <DashboardSidebar links={LINKS} roleLabel="Espace formateur" />
          <main className="flex-1 bg-lightGray/50 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
