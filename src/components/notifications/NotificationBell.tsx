import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/button'

const DROPDOWN_PREVIEW_COUNT = 8

/** Cloche de notifications avec badge non-lu et aperçu déroulant, présente dans la Navbar. */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-gray-500 hover:bg-lightGray hover:text-primary"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-dark">Notifications</p>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()} className="h-auto p-1 text-xs">
                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Tout marquer lu
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            <NotificationList notifications={notifications.slice(0, DROPDOWN_PREVIEW_COUNT)} onMarkAsRead={markAsRead.mutate} />
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-2 text-center text-xs font-medium text-primary hover:bg-lightGray"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  )
}
