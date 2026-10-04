// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { buildVoteLink, clearVoteToken, currentVoteToken, takeVoteToken } from './vote-link'

afterEach(() => {
  clearVoteToken()
  window.history.replaceState(null, '', '/')
})

describe('vote link', () => {
  it('puts the API url on this origin', () => {
    expect(buildVoteLink('https://app.test', '/glos#t=abc')).toBe('https://app.test/glos#t=abc')
  })

  it('takes the token and removes the fragment at once', () => {
    window.history.replaceState(null, '', '/glos?x=1#t=secret')
    expect(takeVoteToken()).toBe('secret')
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?x=1')
    expect(currentVoteToken()).toBe('secret')
  })

  it('has nothing without a token and keeps nothing in storage', () => {
    window.history.replaceState(null, '', '/glos#other=1')
    expect(takeVoteToken()).toBeNull()
    expect(currentVoteToken()).toBeNull()
    window.history.replaceState(null, '', '/glos#t=secret')
    takeVoteToken()
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('secret')
    expect(JSON.stringify({ ...localStorage })).not.toContain('secret')
  })
})
