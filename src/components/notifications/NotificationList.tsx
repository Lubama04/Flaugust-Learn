import { Bell, MessageSquare, Clock, TrendingDown } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Notification } from '@/types'
import type { UseMutationResult } from '@tanstack/react-query'

const TYPE_ICONS: Record<string, typeof Bell> = {
  chat_urgent: MessageSquare,
  formation_reminder: Clock,
  inactivity_alert: TrendingDown,
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

interface NotificationListProps {
  notifications: Notification[]
  onMarkAsRead: UseMutationResult<void, Error, string>['mutate']
}

export function NotificationList({ notifications, onMarkAsRead }: NotificationListProps) {
  if (notifications.length === 0) {
    return <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour !" />
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notification) => {
        const Icon = TYPE_ICONS[notification.type] ?? Bell
        return (
          <button
            key={notification.id}
            type="button"
            onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-lightGray ${
              notification.is_read ? '' : 'bg-primary/5'
            }`}
          >
            <div className={`mt-0.5 rounded-full p-1.5 ${notification.is_read ? 'bg-gray-100 text-gray-400' : 'bg-primary/10 text-primary'}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-dark">{notification.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{notification.message}</p>
              <p className="mt-1 text-[11px] text-gray-300">{timeAgo(notification.created_at)}</p>
            </div>
            {!notification.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}
