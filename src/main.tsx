import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupPwaAutoReload } from './pwa'
import { GlobalErrorBoundary } from './components/shared/GlobalErrorBoundary'

setupPwaAutoReload()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
