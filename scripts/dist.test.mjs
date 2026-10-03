import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// Acceptance criterion: a production build contains neither MSW nor the fake session.
// Builds into a temp dir with the mock switch on (the worst case) and looks for strings that
// survive minification: file names, string literals, fixture data. Identifiers are renamed by
// the minifier, so they prove nothing. A development-mode build must contain them all (the
// positive control), otherwise the scan could pass because it looks for the wrong things.
const MARKERS = [
  // The worker script and the fake session.
  'mockServiceWorker',
  'mock-access-token',
  'mock.invalid',
  'Ola Testowa',
  // Fixtures and scenario names.
  'family-warsaw',
  'Babcia Halina',
  'tuttitrip-mock-scenario',
  // MSW's own runtime.
  'MOCK_ACTIVATE',
  'Failed to register the Service Worker',
]

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  )

/** Builds the app and returns the files that contain a marker, as "path: marker". */
function build(nodeEnv) {
  const out = mkdtempSync(join(tmpdir(), 'tuttitrip-dist-'))
  dirs.push(out)
  // Vitest sets NODE_ENV=test, which Vite would read as a development build: set it explicitly.
  execFileSync(
    'pnpm',
    ['exec', 'vite', 'build', '--outDir', out, '--emptyOutDir', '--mode', nodeEnv],
    { env: { ...process.env, NODE_ENV: nodeEnv, VITE_API_MOCK: '1' }, stdio: 'pipe' },
  )
  const files = walk(out)
  const found = files
    .filter((file) => /\.(js|html|css|webmanifest|map)$/.test(file))
    .flatMap((file) => {
      const text = readFileSync(file, 'utf8')
      return MARKERS.filter((marker) => text.includes(marker)).map(
        (marker) => `${file.slice(out.length)}: ${marker}`,
      )
    })
  return { files, found }
}

const dirs = []
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

describe('build', () => {
  it('production has no MSW, mock worker, fixtures or fake session in dist/', () => {
    const { files, found } = build('production')
    expect(files.length).toBeGreaterThan(0)
    expect(files.filter((file) => file.endsWith('mockServiceWorker.js'))).toEqual([])
    expect(found).toEqual([])
  }, 180_000)

  it('positive control: a development build with the mock switch has every marker', () => {
    const { found } = build('development')
    for (const marker of MARKERS)
      expect(
        found.some((hit) => hit.endsWith(`: ${marker}`)),
        `marker "${marker}" not found in the development build`,
      ).toBe(true)
  }, 180_000)
})
