import { registerSW } from 'virtual:pwa-register'

/**
 * Enregistrement du service worker avec rechargement automatique à chaque mise à jour.
 *
 * Cause racine d'un bug de cache observé en production : le plugin PWA, sans appel explicite
 * à registerSW() depuis 'virtual:pwa-register', injecte un script d'enregistrement minimal
 * (juste `navigator.serviceWorker.register(...)`) qui ne vérifie jamais les mises à jour et ne
 * recharge jamais la page. Avec registerType: 'autoUpdate', le nouveau service worker prend
 * bien le contrôle en arrière-plan (skipWaiting + clientsClaim), mais l'onglet déjà ouvert
 * continue d'exécuter l'ANCIEN bundle JS tant qu'il n'est pas rechargé — un correctif déployé
 * côté serveur pouvait donc rester invisible indéfiniment pour un utilisateur qui garde
 * l'application ouverte sans jamais faire un rechargement complet (usage PWA typique).
 * On écoute donc 'controllerchange' pour recharger dès qu'un nouveau service worker prend le
 * contrôle, et on vérifie périodiquement (et au retour au premier plan) s'il existe une
 * nouvelle version.
 */
export function setupPwaAutoReload(): void {
  if (!('serviceWorker' in navigator)) return

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const checkForUpdate = () => void registration.update()
      setInterval(checkForUpdate, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
    },
  })

  let hasReloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return
    hasReloaded = true
    window.location.reload()
  })
}
