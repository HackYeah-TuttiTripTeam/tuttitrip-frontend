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

const escapeAttr = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * Puts the descriptions into index.html: the Polish one in the meta tag (HTML-escaped), both in
 * the inline language script as JSON (`<` escaped so a text can never close the script).
 * Function replacers: the texts are data, `$&` in them must not be a pattern.
 */
export function injectDescriptions(html: string, texts: { pl: string; en: string }): string {
  const json = JSON.stringify(texts).replaceAll('<', '\\u003c')
  return html
    .replaceAll('__DESCRIPTIONS__', () => json)
    .replaceAll('%DESCRIPTION_PL%', () => escapeAttr(texts.pl))
}

/** Static files copied from public/ that the production service worker precaches. */
export const includeAssets = [
  'favicon.ico',
  'favicon.svg',
  'icon-32.png',
  'apple-touch-icon-180x180.png',
]

export function workboxOptions(production: boolean): Workbox {
  return {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    // Runs on activate: open pages of an older install reload once (see public/sw-activate.js).
    importScripts: ['sw-activate.js'],
    // No navigateFallback: it would answer navigations from the precache, i.e. a stale
    // index.html that points at chunks the newest deploy no longer serves.
    navigateFallback: undefined,
    // Outside production nothing is precached or cached at runtime, so the browser's own
    // HTTP cache (revalidated, see headersFile) is the only cache.
    // index.html is never precached; hashed assets, icons and the fonts (about 85 KB, so the
    // offline shell keeps its typefaces) are in production. Photos are not: they are big and
    // only the public pages show them.
    globPatterns: production ? ['**/*.{js,css,svg,png,ico,woff2}'] : [],
    // Files under assets/ keep revision: null (the hash in the name is the version), except the
    // fonts and photos: they keep their names (vite.config.ts), so they need a content revision
    // or a deploy would never replace the precached copy. Overrides the plugin's /^assets\//.
    dontCacheBustURLsMatching: /^assets\/(?!fonts\/|photos\/)/,
    // Share images are for crawlers only; no need to precache them.
    globIgnores: ['og/*.png'],
    runtimeCaching: production
      ? [
          {
            // Functions here are serialized into sw.js, so they must be self-contained.
            // /api/* navigations (Swagger at /api/v1/docs) are not the app shell.
            urlPattern: ({ request, url }: { request: Request; url: URL }) =>
              request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
              // One entry for every route: the SPA shell. Offline, any deep link gets it.
              plugins: [{ cacheKeyWillBeUsed: async () => '/index.html' }],
            },
          },
        ]
      : [
          // Workbox refuses a service worker without any route or precache entry. This one
          // caches nothing: the API always goes to the network.
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
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
# Non-production build: always revalidate (ETag), so a deploy shows at once, and keep
# search engines out (the public pages say the same through the Worker).
/*
  Cache-Control: no-cache
  X-Robots-Tag: noindex
`
  }
  return `${common}
# The service worker and the app shell must be revalidated so a new deploy reaches
# installed PWAs; hashed assets are immutable.
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw-activate.js
  Cache-Control: no-cache
/workbox-*
  Cache-Control: public, max-age=31536000, immutable
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`
}
