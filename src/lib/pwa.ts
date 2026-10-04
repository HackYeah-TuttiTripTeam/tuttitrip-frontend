import { registerSW } from 'virtual:pwa-register'
import { pwaUpdateCheckMs } from '@/lib/env'
import { installStaleAssetReload } from '@/lib/stale-assets'

type ControllerEvents = Pick<ServiceWorkerContainer, 'controller' | 'addEventListener'>

/**
 * Reloads the page once when a NEW service worker takes control of it. The first
 * install claims a page that had no controller; that is not an update and does not
 * reload. The controller is tracked live: after the first claim every later
 * `controllerchange` is an update. Returns nothing; `reload` is injected for tests.
 */
export function reloadOnControllerUpdate(
  container: ControllerEvents,
  reload: () => void = () => window.location.reload(),
): void {
  let hasController = container.controller !== null
  let reloading = false
  container.addEventListener('controllerchange', () => {
    const isUpdate = hasController
    hasController = true
    if (!isUpdate || reloading) return
    reloading = true
    reload()
  })
}

/**
 * Installs the service worker. A new version skips waiting and claims the page
 * (pwa.config.ts), then the page reloads once so it runs the new bundle. Chunks
 * removed by a newer deploy trigger one guarded reload as well (stale-assets.ts).
 */
export function registerServiceWorker(): void {
  installStaleAssetReload()
  if (!('serviceWorker' in navigator)) return

  reloadOnControllerUpdate(navigator.serviceWorker)

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
      setInterval(check, pwaUpdateCheckMs)
    },
  })
}
