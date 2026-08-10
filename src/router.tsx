import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'

import { PublicLayout } from '@/components/layout/PublicLayout'
import { ApprentLayout } from '@/components/layout/ApprentLayout'
import { FormateurLayout } from '@/components/layout/FormateurLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'

import { HomePage } from '@/pages/public/HomePage'
import { CataloguePage } from '@/pages/public/CataloguePage'
import { CourseDetailPage } from '@/pages/public/CourseDetailPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { RegisterPage } from '@/pages/public/RegisterPage'
import { VerifyCertificatePage } from '@/pages/public/VerifyCertificatePage'
import { UnauthorizedPage } from '@/pages/public/UnauthorizedPage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'

import { DashboardPage } from '@/pages/apprenant/DashboardPage'
import { MesFormationsPage } from '@/pages/apprenant/MesFormationsPage'
import { MesCertificatsPage } from '@/pages/apprenant/MesCertificatsPage'
import { ProfilPage } from '@/pages/apprenant/ProfilPage'

import { DashboardFormateurPage } from '@/pages/formateur/DashboardFormateurPage'
import { InscriptionsPage } from '@/pages/formateur/InscriptionsPage'

import { DashboardAdminPage } from '@/pages/admin/DashboardAdminPage'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// ── Groupe PUBLIC ──────────────────────────────────────────────
const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-layout',
  component: PublicLayout,
})

const homeRoute = createRoute({ getParentRoute: () => publicLayoutRoute, path: '/', component: HomePage })
const catalogueRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/catalogue',
  component: CataloguePage,
})
export const courseDetailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/formation/$slug',
  component: CourseDetailPage,
})
const loginRoute = createRoute({ getParentRoute: () => publicLayoutRoute, path: '/login', component: LoginPage })
const registerRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/inscription',
  component: RegisterPage,
})
const verifyCertificateRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/verify-certificat',
  component: VerifyCertificatePage,
})
const unauthorizedRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/unauthorized',
  component: UnauthorizedPage,
})
// Le profil est accessible à tous les rôles authentifiés — pas de sidebar dédiée.
const profilRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/profil',
  component: () => (
    <ProtectedRoute>
      <ProfilPage />
    </ProtectedRoute>
  ),
})

// ── Groupe APPRENANT ───────────────────────────────────────────
const apprentLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'apprenant-layout',
  component: ApprentLayout,
})
const dashboardRoute = createRoute({
  getParentRoute: () => apprentLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
})
const mesFormationsRoute = createRoute({
  getParentRoute: () => apprentLayoutRoute,
  path: '/mes-formations',
  component: MesFormationsPage,
})
const mesCertificatsRoute = createRoute({
  getParentRoute: () => apprentLayoutRoute,
  path: '/mes-certificats',
  component: MesCertificatsPage,
})

// ── Groupe FORMATEUR ───────────────────────────────────────────
const formateurLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'formateur-layout',
  component: FormateurLayout,
})
const formateurDashboardRoute = createRoute({
  getParentRoute: () => formateurLayoutRoute,
  path: '/formateur',
  component: DashboardFormateurPage,
})
const inscriptionsRoute = createRoute({
  getParentRoute: () => formateurLayoutRoute,
  path: '/formateur/inscriptions',
  component: InscriptionsPage,
})

// ── Groupe ADMIN ───────────────────────────────────────────────
const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'admin-layout',
  component: AdminLayout,
})
const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/admin',
  component: DashboardAdminPage,
})

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    homeRoute,
    catalogueRoute,
    courseDetailRoute,
    loginRoute,
    registerRoute,
    verifyCertificateRoute,
    unauthorizedRoute,
    profilRoute,
  ]),
  apprentLayoutRoute.addChildren([dashboardRoute, mesFormationsRoute, mesCertificatsRoute]),
  formateurLayoutRoute.addChildren([formateurDashboardRoute, inscriptionsRoute]),
  adminLayoutRoute.addChildren([adminDashboardRoute]),
])

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
