// Service worker and HTTP cache settings, split by environment (used by vite.config.ts).
//
//   production (VITE_APP_ENV=main)  precached assets, network-first app shell with an
//                                   offline fallback, long-lived immutable /assets/*
//   everything else (develop, PR previews, local builds)
//                                   nothing precached, navigations always from the
//                                   network, every response revalidated, so a deploy is
//                                   visible on the next load
//
// In both: a new service worker activates and takes control at once, and outdated
// caches are removed. src/lib/pwa.ts then reloads the page once when control changes.
import type { VitePWAOptions } from 'vite-plugin-pwa'

type Workbox = NonNullable<VitePWAOptions['workbox']>

/** Only the `main` deployment gets production-grade caching. */
export function isProductionBuild(appEnv: string | undefined): boolean {
  return appEnv?.trim() === 'main'
}

export function workboxOptions(production: boolean): Workbox {
  return {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    // No navigateFallback: it would answer navigations from the precache, i.e. a stale
    // index.html that points at chunks the newest deploy no longer serves. The
    // navigation route below asks the network first instead.
    navigateFallback: undefined,
    // index.html is never precached (see above); hashed assets and icons are.
    globPatterns: production ? ['**/*.{js,css,svg,png,ico,webmanifest}'] : [],
    // Share images are for crawlers only; no need to precache them.
    globIgnores: ['og-image-*.png'],
    runtimeCaching: [
      {
        // Functions here are serialized into sw.js, so they must be self-contained.
        // /api/* navigations (Swagger at /api/v1/docs) are not the app shell.
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
        handler: production ? 'NetworkFirst' : 'NetworkOnly',
        options: {
          cacheName: 'app-shell',
          // Workbox only allows a timeout together with NetworkFirst.
          ...(production && { networkTimeoutSeconds: 3 }),
          // One entry for every route: the SPA shell. Offline, any deep link gets it.
          plugins: [{ cacheKeyWillBeUsed: async () => '/index.html' }],
        },
      },
    ],
  }
}

/** Content of dist/_headers (Cloudflare Workers static assets). */
export function headersFile(production: boolean): string {
  // Nothing leaves the site in a Referer header: an invitation link must stay private even
  // if a page ever links out. (Its token is in the fragment, which browsers never send.)
  const common = `/*
  Referrer-Policy: no-referrer
`
  if (!production) {
    return `${common}
# Non-production build: always revalidate (ETag), so a deploy shows at once.
/*
  Cache-Control: no-cache
`
  }
  return `${common}
# The service worker and the app shell must be revalidated so a new deploy reaches
# installed PWAs; hashed assets are immutable.
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`
}
