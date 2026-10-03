import { describe, expect, it } from 'vitest'
import { isStaleChunkError, type ReloadDeps, reloadIfStaleChunk, reloadOnce } from './stale-assets'

function setup(start = 1_000_000) {
  const store = new Map<string, string>()
  let time = start
  let reloads = 0
  const deps: ReloadDeps = {
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
    now: () => time,
    reload: () => {
      reloads++
    },
  }
  return { deps, advance: (ms: number) => (time += ms), reloads: () => reloads }
}

describe('isStaleChunkError', () => {
  it('recognises the browser messages for a failed dynamic import', () => {
    expect(
      isStaleChunkError(
        new TypeError('Failed to fetch dynamically imported module: https://x/a.js'),
      ),
    ).toBe(true)
    expect(isStaleChunkError(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new Error('Network error'))).toBe(false)
    expect(isStaleChunkError(undefined)).toBe(false)
  })
})

describe('reloadOnce', () => {
  it('reloads the first time and not again within 30 seconds (no loop)', () => {
    const { deps, advance, reloads } = setup()
    expect(reloadOnce(deps)).toBe(true)
    advance(5_000)
    expect(reloadOnce(deps)).toBe(false)
    expect(reloads()).toBe(1)
  })

  it('reloads again after the window has passed', () => {
    const { deps, advance, reloads } = setup()
    reloadOnce(deps)
    advance(31_000)
    expect(reloadOnce(deps)).toBe(true)
    expect(reloads()).toBe(2)
  })

  it('does not reload when storage is unavailable', () => {
    const { deps, reloads } = setup()
    const broken: ReloadDeps = {
      ...deps,
      storage: {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {},
      },
    }
    expect(reloadOnce(broken)).toBe(false)
    expect(reloads()).toBe(0)
  })
})

describe('reloadIfStaleChunk', () => {
  it('ignores unrelated errors', () => {
    const { deps, reloads } = setup()
    expect(reloadIfStaleChunk(new Error('boom'), deps)).toBe(false)
    expect(reloads()).toBe(0)
  })

  it('reloads for a stale chunk error', () => {
    const { deps, reloads } = setup()
    expect(
      reloadIfStaleChunk(new TypeError('Failed to fetch dynamically imported module'), deps),
    ).toBe(true)
    expect(reloads()).toBe(1)
  })
})
