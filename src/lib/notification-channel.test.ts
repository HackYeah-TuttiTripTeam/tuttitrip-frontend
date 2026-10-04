import { describe, expect, it } from 'vitest'
import { claimToast } from './notification-channel'
import { PAGE_SIZES } from './pagination'

describe('claimToast', () => {
  it('lets the first ask show the toast and refuses the repeat', () => {
    const id = crypto.randomUUID()
    expect(claimToast(id)).toBe(true)
    expect(claimToast(id)).toBe(false)
  })
})

describe('bulk marking limit', () => {
  it('the largest page fits the API limit of 100 ids per mark', () => {
    expect(Math.max(...PAGE_SIZES)).toBeLessThanOrEqual(100)
  })
})
