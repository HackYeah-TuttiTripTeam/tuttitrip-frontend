import { describe, expect, it } from 'vitest'
import type { Knowledge } from '@/lib/interview'
import { resumeSummary } from '@/lib/interview'
import { familyProfiles, trip } from '@/mocks/fixtures'
import { emptyTrip } from '@/mocks/interview'

const knowledge = (over: Partial<Knowledge> = {}): Knowledge => ({
  trip: trip(),
  people: familyProfiles(),
  preferences: [],
  missing: [],
  sources: [],
  ...over,
})

describe('resumeSummary', () => {
  it('names what the trip holds and what the API still asks about', () => {
    const summary = resumeSummary(
      knowledge({
        trip: trip({ budget_total_min: null, budget_total_max: null, budget_day_min: null }),
        missing: [
          { field: 'budget' },
          { field: 'preferences', profile_id: 'a' },
          { field: 'preferences', profile_id: 'b' },
        ],
      }),
    )
    expect(summary.known).toEqual(['destination', 'dates', 'people'])
    expect(summary.missing).toEqual(['budget', 'preferences'])
    expect(summary.peopleCount).toBe(5)
  })

  it('lets the API win: a field it still asks about is not settled', () => {
    const summary = resumeSummary(knowledge({ missing: [{ field: 'people' }] }))
    expect(summary.known).not.toContain('people')
  })

  it('has nothing settled for an empty trip', () => {
    const summary = resumeSummary(
      knowledge({ trip: emptyTrip(), people: [], missing: [{ field: 'destination' }] }),
    )
    expect(summary.known).toEqual([])
  })
})
