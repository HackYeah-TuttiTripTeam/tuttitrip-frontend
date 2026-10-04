// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { returnToHere } from './use-session'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('returnToHere', () => {
  it('returns to the path and query, never to a fragment', () => {
    window.history.replaceState(null, '', '/join?scenario=x#t=secret-token')
    const { returnTo } = returnToHere()
    expect(returnTo).toBe('/join?scenario=x')
    expect(returnTo).not.toContain('#')
    expect(returnTo).not.toContain('secret-token')
  })
})
