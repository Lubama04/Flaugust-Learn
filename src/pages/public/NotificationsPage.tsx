import { CheckCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/button'

function NotificationsContent() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
            <CheckCheck className="mr-1.5 h-4 w-4" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement…" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <NotificationList notifications={notifications} onMarkAsRead={markAsRead.mutate} />
        </div>
      )}
    </div>
  )
}

export function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  )
}
