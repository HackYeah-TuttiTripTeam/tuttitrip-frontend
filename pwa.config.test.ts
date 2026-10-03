import { describe, expect, it } from 'vitest'
import { headersFile, isProductionBuild, workboxOptions } from './pwa.config.ts'

describe('isProductionBuild', () => {
  it('is true only for the main deployment', () => {
    expect(isProductionBuild('main')).toBe(true)
    for (const env of ['develop', 'feature-x', '', undefined]) {
      expect(isProductionBuild(env)).toBe(false)
    }
  })
})

describe('workboxOptions', () => {
  for (const production of [true, false]) {
    it(`activates a new worker at once and cleans old caches (production=${production})`, () => {
      const options = workboxOptions(production)
      expect(options.skipWaiting).toBe(true)
      expect(options.clientsClaim).toBe(true)
      expect(options.cleanupOutdatedCaches).toBe(true)
    })

    it(`never answers navigations from a precached index.html (production=${production})`, () => {
      const options = workboxOptions(production)
      expect(options.navigateFallback).toBeUndefined()
      expect(options.globPatterns?.join()).not.toContain('html')
    })
  }

  it('asks the network first in production, and has no navigation route elsewhere', () => {
    const rules = (production: boolean) => workboxOptions(production).runtimeCaching ?? []
    expect(rules(true)[0]?.handler).toBe('NetworkFirst')
    expect(rules(true)[0]?.options?.networkTimeoutSeconds).toBe(3)
    expect(rules(true)[0]?.options?.cacheName).toBe('app-shell')
    // Outside production the only route is the API pass-through: nothing is cached.
    expect(rules(false).map((rule) => rule.handler)).toEqual(['NetworkOnly'])
    expect(rules(false)[0]?.options).toBeUndefined()
  })

  it('precaches nothing outside production', () => {
    expect(workboxOptions(false).globPatterns).toEqual([])
    expect(workboxOptions(true).globPatterns?.length).toBeGreaterThan(0)
  })

  it('treats only non-API navigations as the app shell in production', () => {
    const rule = workboxOptions(true).runtimeCaching?.[0]
    const match = rule?.urlPattern as (ctx: { request: Request; url: URL }) => boolean
    const ctx = (path: string, mode: string) => ({
      request: { mode } as Request,
      url: new URL(path, 'https://app.test'),
    })
    expect(match(ctx('/trips', 'navigate'))).toBe(true)
    expect(match(ctx('/api/v1/docs', 'navigate'))).toBe(false)
    expect(match(ctx('/assets/a.js', 'cors'))).toBe(false)
  })

  it('imports the activate script that reloads open windows of an older install', () => {
    expect(workboxOptions(true).importScripts).toEqual(['sw-activate.js'])
    expect(workboxOptions(false).importScripts).toEqual(['sw-activate.js'])
  })
})

describe('headersFile', () => {
  it('keeps the no-referrer policy everywhere', () => {
    for (const production of [true, false]) {
      expect(headersFile(production)).toContain('Referrer-Policy: no-referrer')
    }
  })

  it('revalidates everything outside production', () => {
    const file = headersFile(false)
    expect(file).toContain('Cache-Control: no-cache')
    expect(file).not.toContain('immutable')
  })

  it('keeps hashed assets immutable in production', () => {
    expect(headersFile(true)).toContain(
      '/assets/*\n  Cache-Control: public, max-age=31536000, immutable',
    )
  })
})
