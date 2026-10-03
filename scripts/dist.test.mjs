import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Acceptance criterion: a production build contains neither MSW nor the fake session.
// Builds into a temp dir, with the mock switch on as the worst case.
const FORBIDDEN = [
  'mockServiceWorker',
  'msw/browser',
  'setupWorker',
  'MockAuthProvider',
  'mock-access-token',
  'mock.invalid',
  'Ola Testowa',
  'VITE_API_MOCK',
]

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  )

describe('production build', () => {
  let out = ''

  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), 'tuttitrip-dist-'))
    execFileSync('pnpm', ['exec', 'vite', 'build', '--outDir', out, '--emptyOutDir'], {
      // Vitest sets NODE_ENV=test, which Vite would read as a development build.
      env: { ...process.env, NODE_ENV: 'production', VITE_API_MOCK: '1' },
      stdio: 'pipe',
    })
  }, 180_000)

  afterAll(() => rmSync(out, { recursive: true, force: true }))

  it('has no MSW, mock worker or fake session in dist/', () => {
    const files = walk(out)
    expect(files.length).toBeGreaterThan(0)
    expect(files.filter((file) => file.endsWith('mockServiceWorker.js'))).toEqual([])
    const found = files
      .filter((file) => /\.(js|html|css|webmanifest|map)$/.test(file))
      .flatMap((file) => {
        const text = readFileSync(file, 'utf8')
        return FORBIDDEN.filter((needle) => text.includes(needle)).map(
          (needle) => `${file.slice(out.length)}: ${needle}`,
        )
      })
    expect(found).toEqual([])
  }, 180_000)
})
