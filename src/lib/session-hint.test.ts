// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { hasStoredSession } from './session-hint'

afterEach(() => localStorage.clear())

describe('hasStoredSession', () => {
  it('is false for a new visitor', () => {
    expect(hasStoredSession('')).toBe(false)
    expect(hasStoredSession('?lang=en')).toBe(false)
  })

  it('is true with an Auth0 token in storage', () => {
    localStorage.setItem('@@auth0spajs@@::client::audience::scope', '{}')
    expect(hasStoredSession('')).toBe(true)
  })

  it('is true while Auth0 hands the user back, before any token is stored', () => {
    expect(hasStoredSession('?code=abc&state=xyz')).toBe(true)
    expect(hasStoredSession('?error=access_denied&state=xyz')).toBe(true)
    expect(hasStoredSession('?code=abc')).toBe(false)
  })
})
