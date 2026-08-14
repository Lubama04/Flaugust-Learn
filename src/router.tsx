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
import { CertificateViewerPage } from '@/pages/public/CertificateViewerPage'
import { UnauthorizedPage } from '@/pages/public/UnauthorizedPage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'
import { CourseChatPage } from '@/pages/public/CourseChatPage'
import { NotificationsPage } from '@/pages/public/NotificationsPage'

import { DashboardPage } from '@/pages/apprenant/DashboardPage'
import { MesFormationsPage } from '@/pages/apprenant/MesFormationsPage'
import { MesCertificatsPage } from '@/pages/apprenant/MesCertificatsPage'
import { MonDossierPage } from '@/pages/apprenant/MonDossierPage'
import { ProfilPage } from '@/pages/apprenant/ProfilPage'
import { CourseReaderPage } from '@/pages/apprenant/CourseReaderPage'
import { ExamenFinalPage } from '@/pages/apprenant/ExamenFinalPage'

import { DashboardFormateurPage } from '@/pages/formateur/DashboardFormateurPage'
import { InscriptionsPage } from '@/pages/formateur/InscriptionsPage'
import { CourseCreatePage } from '@/pages/formateur/CourseCreatePage'
import { CourseEditPage } from '@/pages/formateur/CourseEditPage'
import { QuizGeneratorPage } from '@/pages/formateur/QuizGeneratorPage'
import { AssistantIAPage } from '@/pages/formateur/AssistantIAPage'

import { DashboardAdminPage } from '@/pages/admin/DashboardAdminPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { PaymentsPage } from '@/pages/admin/PaymentsPage'

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
export const loginRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})
const registerRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/inscription',
  component: RegisterPage,
})
const verifyCertificateRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/verify-certificat',
  component: () => <VerifyCertificatePage />,
})
export const certificateVerifyTokenRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/certificat/verifier/$token',
  component: function CertificateVerifyTokenRoute() {
    const { token } = certificateVerifyTokenRoute.useParams()
    return <VerifyCertificatePage initialToken={token} />
  },
})
export const certificateViewerRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/certificat/$id',
  component: CertificateViewerPage,
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
// Mon dossier de formation (fiches, notes, exercices) : accessible à tous les rôles authentifiés.
const dossierRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/dossier',
  component: () => (
    <ProtectedRoute>
      <MonDossierPage />
    </ProtectedRoute>
  ),
})
// Discussion de formation : accessible aux inscrits actifs, au formateur propriétaire et à l'admin.
export const courseChatRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/formation/$slug/discussion',
  component: CourseChatPage,
})
const notificationsRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/notifications',
  component: NotificationsPage,
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
const courseCreateRoute = createRoute({
  getParentRoute: () => formateurLayoutRoute,
  path: '/formateur/formations/nouvelle',
  component: CourseCreatePage,
})
export const courseEditRoute = createRoute({
  getParentRoute: () => formateurLayoutRoute,
  path: '/formateur/formations/$courseId/editer',
  component: CourseEditPage,
})
const quizGeneratorRoute = createRoute({
  getParentRoute: () => formateurLayoutRoute,
  path: '/formateur/quiz-generator',
  component: QuizGeneratorPage,
})
const assistantIARoute = createRoute({
  getParentRoute: () => formateurLayoutRoute,
  path: '/formateur/assistant-ia',
  component: AssistantIAPage,
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
const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/admin/utilisateurs',
  component: UsersPage,
})
const adminPaymentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/admin/paiements',
  component: PaymentsPage,
})

// ── Lecteur de formation et examen final (immersifs, sans chrome standard) ──
export const courseReaderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/formation/$slug/apprendre',
  validateSearch: (search: Record<string, unknown>): { session?: string } => ({
    session: typeof search.session === 'string' ? search.session : undefined,
  }),
  component: CourseReaderPage,
})
export const examenFinalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/formation/$slug/examen-final',
  component: ExamenFinalPage,
})

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    homeRoute,
    catalogueRoute,
    courseDetailRoute,
    loginRoute,
    registerRoute,
    verifyCertificateRoute,
    certificateVerifyTokenRoute,
    certificateViewerRoute,
    unauthorizedRoute,
    profilRoute,
    dossierRoute,
    courseChatRoute,
    notificationsRoute,
  ]),
  apprentLayoutRoute.addChildren([dashboardRoute, mesFormationsRoute, mesCertificatsRoute]),
  formateurLayoutRoute.addChildren([
    formateurDashboardRoute,
    inscriptionsRoute,
    courseCreateRoute,
    courseEditRoute,
    quizGeneratorRoute,
    assistantIARoute,
  ]),
  adminLayoutRoute.addChildren([adminDashboardRoute, adminUsersRoute, adminPaymentsRoute]),
  courseReaderRoute,
  examenFinalRoute,
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
