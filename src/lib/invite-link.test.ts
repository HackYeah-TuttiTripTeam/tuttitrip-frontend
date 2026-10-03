// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildInviteLink,
  clearJoinToken,
  currentJoinToken,
  parseInviteFragment,
  peekJoinToken,
  STASH_TTL_MS,
  stashJoinToken,
  takeFragmentToken,
} from './invite-link'

afterEach(() => {
  clearJoinToken()
  window.history.replaceState(null, '', '/')
})

describe('invite link', () => {
  it('puts the token in the fragment, never in the path or query', () => {
    const link = new URL(buildInviteLink('https://tuttitrip.gburek.app', 'abc-DEF_123'))
    expect(link.pathname).toBe('/join')
    expect(link.search).toBe('')
    expect(link.hash).toBe('#t=abc-DEF_123')
  })

  it('escapes a token that is not URL-safe and reads it back', () => {
    const link = new URL(buildInviteLink('https://x.test', 'a+b/c=d&e'))
    expect(parseInviteFragment(link.hash)).toBe('a+b/c=d&e')
  })

  it('finds no token in other fragments', () => {
    expect(parseInviteFragment('')).toBeNull()
    expect(parseInviteFragment('#main')).toBeNull()
    expect(parseInviteFragment('#t=')).toBeNull()
    expect(parseInviteFragment('#t=%20')).toBeNull()
  })
})

describe('takeFragmentToken', () => {
  it('reads the fragment once and takes it off the address bar at once', () => {
    window.history.replaceState({ __TSR_index: 0 }, '', '/join?x=1#t=secret')
    expect(takeFragmentToken()).toBe('secret')
    expect(window.location.hash).toBe('')
    expect(window.location.pathname + window.location.search).toBe('/join?x=1')
    // The router's own bookkeeping in history.state survives; the token is nowhere in it.
    expect(window.history.state).toEqual({ __TSR_index: 0 })
    expect(takeFragmentToken()).toBeNull()
    expect(currentJoinToken()).toBe('secret')
  })

  it('does not store the token anywhere persistent', () => {
    window.history.replaceState(null, '', '/join#t=secret')
    takeFragmentToken()
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('lets a fresh link replace an older stash', () => {
    stashJoinToken('old')
    window.history.replaceState(null, '', '/join#t=new')
    takeFragmentToken()
    expect(peekJoinToken()).toBeNull()
    expect(currentJoinToken()).toBe('new')
  })
})

describe('the stash for the login round-trip', () => {
  it('carries the token over the redirect', () => {
    stashJoinToken('secret', 1_000)
    expect(JSON.parse(sessionStorage.getItem('tuttitrip.join-token') ?? '{}')).toEqual({
      token: 'secret',
      ts: 1_000,
    })
    expect(currentJoinToken(1_000 + 5_000)).toBe('secret')
  })

  it('expires after ten minutes and is removed when read late', () => {
    stashJoinToken('secret', 0)
    expect(currentJoinToken(STASH_TTL_MS - 1)).toBe('secret')
    expect(currentJoinToken(STASH_TTL_MS)).toBeNull()
    expect(sessionStorage.getItem('tuttitrip.join-token')).toBeNull()
  })

  it('ignores a stash it cannot read', () => {
    sessionStorage.setItem('tuttitrip.join-token', 'not json')
    expect(currentJoinToken()).toBeNull()
    sessionStorage.setItem('tuttitrip.join-token', JSON.stringify({ token: 7 }))
    expect(currentJoinToken()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('is cleared by clearJoinToken, memory and storage alike', () => {
    window.history.replaceState(null, '', '/join#t=secret')
    takeFragmentToken()
    stashJoinToken('secret')
    clearJoinToken()
    expect(currentJoinToken()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })
})
