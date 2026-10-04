// Imported by the generated sw.js (workbox importScripts, see pwa.config.ts).
//
// When a new service worker activates, every open window that the OLD worker controlled
// still runs the old bundle (older builds did not reload themselves). Navigate those
// windows once to their own URL so they load the current build. The first install has
// no controlled windows yet, so nothing reloads. Activation happens once per worker
// version and the reloaded page is already served by this worker: no loop.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window' })
      .then((windows) =>
        Promise.all(windows.map((client) => client.navigate(client.url).catch(() => undefined))),
      ),
  )
})
