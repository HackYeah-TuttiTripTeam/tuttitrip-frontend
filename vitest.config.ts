import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Two projects. CI runs `unit` only (pnpm test); `integration` (pnpm test:integration) holds the
// slow tests that spawn real production builds and runs in the local smoke step before a PR.
// A test belongs to `integration` when its file name ends in `.int.test.*`.
const INTEGRATION = '**/*.int.test.{ts,tsx,mjs}'

export default defineConfig({
  define: { __API_MOCK__: false },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            'src/**/*.test.{ts,tsx}',
            'scripts/**/*.test.mjs',
            'worker/**/*.test.ts',
            'pwa.config.test.ts',
          ],
          exclude: [INTEGRATION],
          setupFiles: ['src/mocks/vitest-setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: [INTEGRATION],
          setupFiles: ['src/mocks/vitest-setup.ts'],
        },
      },
    ],
  },
})
