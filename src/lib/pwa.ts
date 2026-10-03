import { registerSW } from 'virtual:pwa-register'
import { installStaleAssetReload } from '@/lib/stale-assets'

const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Installs the service worker. A new version skips waiting and claims the page
 * (pwa.config.ts), then the page reloads once so it runs the new bundle. The first
 * install (no controller yet) does not reload. Chunks removed by a newer deploy
 * trigger one guarded reload as well (stale-assets.ts).
 */
export function registerServiceWorker(): void {
  installStaleAssetReload()
  if (!('serviceWorker' in navigator)) return

  const hadController = navigator.serviceWorker.controller !== null
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Long-lived tabs and installed PWAs also look for a new version when they
      // come back to the foreground and once an hour.
      const check = () => void registration.update().catch(() => undefined)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, UPDATE_CHECK_MS)
    },
  })
}
