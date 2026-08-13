import { Outlet } from '@tanstack/react-router'
import { ShieldCheck, Users, Wallet } from 'lucide-react'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { DashboardSidebar, type SidebarLink } from '@/components/layout/DashboardSidebar'
import { Navbar } from '@/components/layout/Navbar'

const LINKS: SidebarLink[] = [
  { to: '/admin', label: "Vue d'ensemble", icon: ShieldCheck },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/admin/paiements', label: 'Paiements', icon: Wallet },
]

export function AdminLayout() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex min-h-screen flex-col">
        <Navbar dashboardLinks={LINKS} />
        <div className="flex flex-1">
          <DashboardSidebar links={LINKS} roleLabel="Administration" />
          <main className="flex-1 bg-lightGray/50 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
