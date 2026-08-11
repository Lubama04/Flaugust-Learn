import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Notification } from '@/types'

const NOTIFICATIONS_LIMIT = 50

async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT)
  if (error) throw error
  return data
}

/** Notifications in-app de l'utilisateur connecté : liste, compteur non-lu, realtime, marquage lu. */
export function useNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const queryClient = useQueryClient()
  const queryKey = ['notifications', userId]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  })

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          queryClient.setQueryData<Notification[]>(queryKey, (old) => {
            const newRow = payload.new as Notification
            if (!old) return [newRow]
            if (old.some((n) => n.id === newRow.id)) return old
            return [newRow, ...old]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const unreadCount = useMemo(() => (query.data ?? []).filter((n) => !n.is_read).length, [query.data])

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
      if (error) throw error
    },
    onMutate: async () => {
      queryClient.setQueryData<Notification[]>(queryKey, (old) => (old ?? []).map((n) => ({ ...n, is_read: true })))
    },
  })

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }
}
