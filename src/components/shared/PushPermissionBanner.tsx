import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useToast } from '@/hooks/useToast'

const DISMISS_KEY = 'push-banner-dismissed'

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Bannière discrète proposant d'activer les notifications. Affichée seulement si le navigateur
 * les supporte, que la permission n'a été ni accordée ni refusée, et que l'utilisateur ne l'a
 * pas écartée pendant cette session.
 */
export function PushPermissionBanner() {
  const toast = useToast()
  const hasSession = useAuthStore((s) => !!s.session)
  const { isSupported, permission, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [busy, setBusy] = useState(false)

  if (!hasSession || !isSupported || permission !== 'default' || dismissed) return null

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Stockage indisponible : la bannière réapparaîtra au prochain chargement, sans gravité.
    }
    setDismissed(true)
  }

  const handleEnable = async () => {
    setBusy(true)
    try {
      const ok = await subscribe()
      if (ok) toast.success('Notifications activées')
      else handleDismiss()
    } catch {
      toast.error("Impossible d'activer les notifications sur cet appareil")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-gray-200 bg-white p-4 shadow-lg md:bottom-4 md:left-auto md:right-4 md:max-w-sm md:rounded-xl md:border">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-dark">Recevoir des notifications</p>
          <p className="text-xs text-gray">Soyez alerté de vos validations et messages</p>
        </div>
      </div>
      <div className="ml-4 flex shrink-0 gap-2">
        <button type="button" onClick={handleDismiss} className="px-2 py-1 text-xs text-gray-400">
          Plus tard
        </button>
        <button
          type="button"
          onClick={() => void handleEnable()}
          disabled={busy}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          Activer
        </button>
      </div>
    </div>
  )
}
