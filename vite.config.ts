import path from 'node:path'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { msw } from 'msw/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { paraglideOptions } from './i18n.config.mjs'
import en from './messages/en.json' with { type: 'json' }
import pl from './messages/pl.json' with { type: 'json' }
import {
  headersFile,
  includeAssets,
  injectDescriptions,
  isProductionBuild,
  workboxOptions,
} from './pwa.config.ts'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // The app calls /api/v1/... on its own origin. Locally Vite forwards /api to
  // the backend, like the Worker proxy does when deployed (worker/index.ts).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_URL || 'http://localhost:8000'
  // Caching is long-lived only on main; develop and previews revalidate everything.
  const production = isProductionBuild(env.VITE_APP_ENV)
  const apiProxy = { '/api': { target: apiTarget, changeOrigin: true } }

  // Mock mode: VITE_API_MOCK=1 outside a production build. The only definition of the condition;
  // `define` makes it a literal in every module, so production drops the mock entry completely.
  const apiMock =
    loadEnv(mode, process.cwd(), 'VITE_').VITE_API_MOCK === '1' && mode !== 'production'

  let pwaApi:
    | {
        extendManifestEntries(fn: (entries: { url: string }[]) => { url: string }[]): void
      }
    | undefined

  return {
    define: { __API_MOCK__: JSON.stringify(apiMock) },
    build: {
      rollupOptions: {
        output: {
          // Photos and fonts keep their names, so the Worker can point to them from the first
          // HTML, before any script or stylesheet has loaded (lib/photo-data.ts, lib/seo.ts).
          // Rename a file when its content changes: /assets/* is cached as immutable.
          // Everything else is hashed as usual.
          assetFileNames: (asset) => {
            const source = asset.originalFileNames.join(' ')
            if (source.includes('src/assets/photos/')) return 'assets/photos/[name][extname]'
            if (source.includes('src/styles/fonts/')) return 'assets/fonts/[name][extname]'
            return 'assets/[name]-[hash][extname]'
          },
        },
      },
    },
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    plugins: [
      // Must come before react()
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      // Same options as `pnpm i18n` (scripts/i18n.mjs, used outside Vite, e.g. by tsc).
      paraglideVitePlugin(paraglideOptions),
      tailwindcss(),
      // Serves /mockServiceWorker.js for `pnpm dev:mock`. Never in a build: dist/ has no MSW.
      ...(command === 'serve' ? [msw({ mode: 'worker-only' })] : []),
      {
        name: 'tuttitrip:headers',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: '_headers', source: headersFile(production) })
        },
      },
      {
        // index.html carries both descriptions for its inline language script, so the texts
        // stay in messages/*.json (the only place that has them).
        name: 'tuttitrip:html-messages',
        transformIndexHtml: (html) =>
          injectDescriptions(html, { pl: pl.app_description, en: en.app_description }),
      },
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false, // registered in src/lib/pwa.ts
        // Outside production the service worker precaches nothing (pwa.config.ts).
        includeAssets: production ? includeAssets : [],
        includeManifestIcons: production,
        manifest: {
          id: '/',
          name: 'TuttiTrip',
          short_name: 'TuttiTrip',
          // Polish (base locale) in the file; the Worker serves it per language (worker/index.ts).
          description: pl.app_description,
          lang: 'pl',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#00774d',
          background_color: '#f7fcf9',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: workboxOptions(production),
      }),
      {
        // The plugin always adds the web manifest to the precache list. Outside production
        // the service worker precaches nothing (pwa.config.ts), so empty the list; in production
        // only the manifest leaves it. Runs after VitePWA's own configResolved, which fills it.
        name: 'tuttitrip:no-precache-outside-production',
        configResolved(config) {
          const pwa = config.plugins.find((plugin) => plugin.name === 'vite-plugin-pwa')
          pwaApi = pwa?.api
        },
        buildStart() {
          // Production keeps the icons but not the manifest: the Worker serves it per language,
          // and a precached copy would answer in Polish for everyone.
          pwaApi?.extendManifestEntries((entries) =>
            production
              ? entries.filter((entry) => !String(entry.url).endsWith('.webmanifest'))
              : [],
          )
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
