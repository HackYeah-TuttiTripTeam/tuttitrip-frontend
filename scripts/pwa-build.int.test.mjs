// Builds the app for a non-production and for the production environment and checks the
// service worker that comes out (not just the options that go in).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const dirs = []

function build(appEnv) {
  const out = mkdtempSync(join(tmpdir(), `tuttitrip-${appEnv}-`))
  dirs.push(out)
  execFileSync('pnpm', ['exec', 'vite', 'build', '--outDir', out, '--emptyOutDir'], {
    env: { ...process.env, VITE_APP_ENV: appEnv },
    stdio: 'pipe',
  })
  return {
    sw: readFileSync(join(out, 'sw.js'), 'utf8'),
    headers: readFileSync(join(out, '_headers'), 'utf8'),
    index: readFileSync(join(out, 'index.html'), 'utf8'),
    manifest: JSON.parse(readFileSync(join(out, 'manifest.webmanifest'), 'utf8')),
  }
}

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

describe('built service worker', () => {
  it('precaches nothing and has no app-shell cache on develop', () => {
    const { sw, headers } = build('develop')
    expect(sw).not.toContain('precacheAndRoute')
    expect(sw).not.toContain('NetworkFirst')
    expect(sw).not.toContain('app-shell')
    expect(sw).toContain('skipWaiting')
    expect(sw).toContain('sw-activate.js')
    expect(headers).toContain('Cache-Control: no-cache')
    expect(headers).not.toContain('immutable')
  }, 120_000)

  it('precaches the assets and asks the network first for navigations on main', () => {
    const { sw, headers } = build('main')
    expect(sw).toContain('precacheAndRoute')
    // The Worker serves the manifest per language, so a precached copy would stay Polish.
    expect(sw).not.toContain('manifest.webmanifest')
    expect(sw).toContain('pwa-192x192.png')
    expect(sw).not.toContain('.webmanifest')
    expect(sw).not.toContain('"index.html"')
    expect(sw).toContain('NetworkFirst')
    // The offline shell keeps the design-system fonts; photos stay out of the precache.
    expect(sw).toMatch(/assets\/fonts\/[^"]+\.woff2/)
    expect(sw).not.toMatch(/assets\/photos\//)
    expect(headers).toContain('immutable')
  }, 120_000)

  it('builds the base manifest and index.html in Polish, with both texts for the language script', () => {
    const { index, manifest } = build('develop')
    expect(manifest.lang).toBe('pl')
    expect(manifest.description).toContain('Planowanie wyjazdów')
    expect(index).toContain('<html lang="pl">')
    expect(index).not.toContain('%DESCRIPTION')
    expect(index).toContain('<link rel="manifest" href="/manifest.webmanifest">')
    const script =
      [...index.matchAll(/<script>([\s\S]*?)<\/script>/g)].find((m) =>
        m[1].includes('PARAGLIDE_LOCALE'),
      )?.[1] ?? ''
    expect(script).toContain('Group trip planning')
    expect(script).toContain('Planowanie wyjazdów')
  }, 120_000)
})
