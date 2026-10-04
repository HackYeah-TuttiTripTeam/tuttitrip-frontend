import { describe, expect, it } from 'vitest'
import { VOTE_POLL_MAX_MS, VOTE_POLL_MS } from '@/lib/vote-constants'
import { pollInterval } from './use-vote-summary'

describe('pollInterval', () => {
  it('is the base while polls succeed, 5 to 10 seconds', () => {
    expect(pollInterval(0)).toBe(VOTE_POLL_MS)
    expect(VOTE_POLL_MS).toBeGreaterThanOrEqual(5000)
    expect(VOTE_POLL_MS).toBeLessThanOrEqual(10_000)
  })

  it('doubles after each failure and stops at the maximum', () => {
    expect(pollInterval(1)).toBe(VOTE_POLL_MS * 2)
    expect(pollInterval(2)).toBe(VOTE_POLL_MS * 4)
    expect(pollInterval(30)).toBe(VOTE_POLL_MAX_MS)
  })
})
