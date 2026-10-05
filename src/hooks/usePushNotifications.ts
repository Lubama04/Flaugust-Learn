import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // Le service worker est enregistré par vite-plugin-pwa (src/pwa.ts). Absent en développement :
  // le délai évite d'attendre indéfiniment un `ready` qui ne viendrait jamais.
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Service worker indisponible')), 8000)),
  ])
}

async function saveSubscription(userId: string, subscription: PushSubscription) {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) throw new Error('Abonnement push invalide')
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: json.endpoint, p256dh, auth_key: auth, device_info: navigator.userAgent.slice(0, 200) },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
}

export function usePushNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY
  const [permission, setPermission] = useState<NotificationPermission>(isSupported ? Notification.permission : 'denied')
  const [subscribed, setSubscribed] = useState(false)

  // Resynchronise l'abonnement navigateur avec la base : un appareil déjà autorisé doit être
  // rattaché à l'utilisateur connecté (reconnexion, changement de compte).
  useEffect(() => {
    if (!isSupported || !userId || Notification.permission !== 'granted') return
    let cancelled = false
    void (async () => {
      try {
        const registration = await getRegistration()
        const sub = await registration.pushManager.getSubscription()
        if (!sub || cancelled) return
        await saveSubscription(userId, sub)
        if (!cancelled) setSubscribed(true)
      } catch {
        // Silencieux : la resynchronisation est opportuniste.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSupported, userId])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !userId) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return false

    const registration = await getRegistration()
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      }))
    await saveSubscription(userId, subscription)
    setSubscribed(true)
    return true
  }, [isSupported, userId])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      await subscription.unsubscribe()
    }
    setSubscribed(false)
  }, [isSupported])

  return { isSupported, permission, subscribed, subscribe, unsubscribe }
}
