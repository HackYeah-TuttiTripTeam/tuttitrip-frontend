import path from 'node:path'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { paraglideOptions } from './i18n.config.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The app calls /api/v1/... on its own origin. Locally Vite forwards /api to
  // the backend, like the Worker proxy does when deployed (worker/index.ts).
  const apiTarget = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL || 'http://localhost:8000'
  const apiProxy = { '/api': { target: apiTarget, changeOrigin: true } }

  return {
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    plugins: [
      // Must come before react()
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      // Same options as `pnpm i18n` (scripts/i18n.mjs, used outside Vite, e.g. by tsc).
      paraglideVitePlugin(paraglideOptions),
      tailwindcss(),
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
          background_color: '#ffffff',
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
