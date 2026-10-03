import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: { __API_MOCK__: false },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    include: [
      'src/**/*.test.{ts,tsx}',
      'scripts/**/*.test.mjs',
      'worker/**/*.test.ts',
      'pwa.config.test.ts',
    ],
    setupFiles: ['src/mocks/vitest-setup.ts'],
  },
})
