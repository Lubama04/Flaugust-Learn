import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { router } from '@/router'
import { useAuthListener } from '@/hooks/useAuth'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { COLORS } from '@/lib/constants'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AuthBootstrap() {
  useAuthListener()
  return null
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap />
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            success: { iconTheme: { primary: COLORS.secondary, secondary: '#fff' } },
            error: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
