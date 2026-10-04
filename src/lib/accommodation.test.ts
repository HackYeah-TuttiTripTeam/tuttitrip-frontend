import { describe, expect, it } from 'vitest'
import { requirementLabel, tripNights, withoutRequirement, withRequirement } from './accommodation'

describe('tripNights', () => {
  it('lists the check-in dates: every day but the last', () => {
    expect(tripNights('2026-10-10', '2026-10-13')).toEqual([
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
    ])
  })

  it('crosses a month end without skipping a day', () => {
    expect(tripNights('2026-10-31', '2026-11-02')).toEqual(['2026-10-31', '2026-11-01'])
  })

  it('has no nights for one day or without dates', () => {
    expect(tripNights('2026-10-10', '2026-10-10')).toEqual([])
    expect(tripNights(null, '2026-10-10')).toEqual([])
    expect(tripNights('2026-10-10', null)).toEqual([])
  })
})

describe('requirement list helpers', () => {
  const pool = { kind: 'amenity', key: 'pool', hard: false } as const

  it('adds a requirement once and replaces it by kind and key', () => {
    const added = withRequirement([], pool)
    expect(added).toEqual([pool])
    expect(withRequirement(added, { ...pool, hard: true })).toEqual([{ ...pool, hard: true }])
  })

  it('removes only the requirement of that kind and key', () => {
    const list = [pool, { kind: 'platform', key: 'pool', hard: true } as const]
    expect(withoutRequirement(list, 'amenity', 'pool')).toEqual([list[1]])
  })
})

describe('requirementLabel', () => {
  it('names the keys of the dictionary and shows an unknown key as words', () => {
    expect(requirementLabel('amenity', 'pool')).toBe('Basen')
    expect(requirementLabel('platform', 'booking')).toBe('Booking.com')
    expect(requirementLabel('amenity', 'sauna_room')).toBe('sauna room')
  })
})
