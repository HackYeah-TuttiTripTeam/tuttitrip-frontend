import path from 'node:path'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { msw } from 'msw/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { paraglideOptions } from './i18n.config.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // The app calls /api/v1/... on its own origin. Locally Vite forwards /api to
  // the backend, like the Worker proxy does when deployed (worker/index.ts).
  const apiTarget = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL || 'http://localhost:8000'
  const apiProxy = { '/api': { target: apiTarget, changeOrigin: true } }

  // Mock mode: VITE_API_MOCK=1 outside a production build. The only definition of the condition;
  // `define` makes it a literal in every module, so production drops the mock entry completely.
  const apiMock =
    loadEnv(mode, process.cwd(), 'VITE_').VITE_API_MOCK === '1' && mode !== 'production'

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
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false, // registered in src/lib/pwa.ts
        includeAssets: [
          'favicon.ico',
          'favicon.svg',
          'icon-32.png',
          'apple-touch-icon-180x180.png',
        ],
        manifest: {
          id: '/',
          name: 'TuttiTrip',
          short_name: 'TuttiTrip',
          description: 'Planowanie wyjazdów w grupie: plan, po którym nikt nie czuje, że przegrał.',
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
        workbox: {
          // Offline fallback: every navigation is served the cached app shell,
          // the app then shows its own "no connection" state for API calls.
          navigateFallback: '/index.html',
          // /api/v1/docs and other API pages are not part of the app shell.
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          // Share images are for crawlers only; no need to precache them.
          globIgnores: ['og-image-*.png'],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
