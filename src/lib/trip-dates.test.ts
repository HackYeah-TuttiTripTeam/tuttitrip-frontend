import { describe, expect, it } from 'vitest'
import { tripHasEnded } from './trip-dates'

describe('tripHasEnded', () => {
  it('is false during the last day and true from the next midnight', () => {
    expect(tripHasEnded('2026-10-11', new Date(2026, 9, 11, 23, 59))).toBe(false)
    expect(tripHasEnded('2026-10-11', new Date(2026, 9, 12, 0, 0))).toBe(true)
  })

  it('is false for a trip without dates', () => {
    expect(tripHasEnded(null)).toBe(false)
  })
})
