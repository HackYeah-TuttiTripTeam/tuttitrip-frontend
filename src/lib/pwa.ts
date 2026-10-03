import { registerSW } from 'virtual:pwa-register'

/** Installs the service worker; new versions activate on the next load. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  registerSW({ immediate: true })
}
