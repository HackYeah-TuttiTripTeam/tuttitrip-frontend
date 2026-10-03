// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildInviteLink,
  captureJoinToken,
  clearJoinToken,
  parseInviteFragment,
  peekJoinToken,
} from './invite-link'

afterEach(clearJoinToken)

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

describe('token kept for the login round-trip', () => {
  it('keeps the token from the link until it is cleared', () => {
    expect(captureJoinToken('#t=secret')).toBe('secret')
    // After the redirect the fragment is gone; the stash carries the token over.
    expect(captureJoinToken('')).toBe('secret')
    expect(sessionStorage.getItem('tuttitrip.join-token')).toBe('secret')
    clearJoinToken()
    expect(peekJoinToken()).toBeNull()
    expect(sessionStorage.getItem('tuttitrip.join-token')).toBeNull()
  })

  it('survives a page reload through sessionStorage', () => {
    sessionStorage.setItem('tuttitrip.join-token', 'from-storage')
    expect(captureJoinToken('')).toBe('from-storage')
  })

  it('prefers a new link over an old stash', () => {
    captureJoinToken('#t=old')
    expect(captureJoinToken('#t=new')).toBe('new')
  })
})
