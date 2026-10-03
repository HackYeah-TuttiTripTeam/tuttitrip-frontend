import { describe, expect, it } from 'vitest'
import { shellFor } from './shell'

describe('shellFor', () => {
  it('shows the landing page to guests and when auth is disabled', () => {
    expect(shellFor('/', 'anonymous')).toBe('public')
    expect(shellFor('/', 'disabled')).toBe('public')
  })

  it('keeps / bare while the session loads and for signed-in users, so nothing flashes', () => {
    expect(shellFor('/', 'loading')).toBe('bare')
    expect(shellFor('/', 'authenticated')).toBe('bare')
  })

  it('shows the landing page at once to a browser with no stored session', () => {
    expect(shellFor('/', 'loading', false)).toBe('public')
    // A signed-in user is still sent on without a flash of the landing page.
    expect(shellFor('/', 'authenticated', false)).toBe('bare')
  })

  it('uses the public layout for /about and /contact in every state', () => {
    for (const status of ['loading', 'anonymous', 'authenticated', 'disabled'] as const) {
      expect(shellFor('/about', status)).toBe('public')
      expect(shellFor('/contact/', status)).toBe('public')
    }
  })

  it('uses the app shell everywhere else', () => {
    expect(shellFor('/trips', 'anonymous')).toBe('app')
    expect(shellFor('/trips/abc', 'authenticated')).toBe('app')
    expect(shellFor('/nope', 'anonymous')).toBe('app')
  })
})
