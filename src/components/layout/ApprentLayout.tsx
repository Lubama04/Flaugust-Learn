import { Outlet } from '@tanstack/react-router'
import { LayoutDashboard, BookOpen, Award, User } from 'lucide-react'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { DashboardSidebar, type SidebarLink } from '@/components/layout/DashboardSidebar'
import { Navbar } from '@/components/layout/Navbar'

const LINKS: SidebarLink[] = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/mes-formations', label: 'Mes formations', icon: BookOpen },
  { to: '/mes-certificats', label: 'Mes certificats', icon: Award },
  { to: '/profil', label: 'Mon profil', icon: User },
]

export function ApprentLayout() {
  return (
    <ProtectedRoute allowedRoles={['apprenant', 'admin']}>
      <div className="flex min-h-screen flex-col">
        <Navbar dashboardLinks={LINKS} />
        <div className="flex flex-1">
          <DashboardSidebar links={LINKS} roleLabel="Espace apprenant" />
          <main className="flex-1 bg-lightGray/50 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
