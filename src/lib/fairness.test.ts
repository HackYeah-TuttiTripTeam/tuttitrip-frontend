import { describe, expect, it } from 'vitest'
import { familyFairness, familyProfiles, PROFILE_IDS, plan } from '@/mocks/fixtures'
import {
  activeWeightPreset,
  defaultFocus,
  floorShare,
  planChange,
  transferMinutes,
} from './fairness'

const withWeights = (weights: Record<string, number>) =>
  familyProfiles().map((profile) => ({ ...profile, weight: weights[profile.id] ?? 1 }))

describe('activeWeightPreset', () => {
  it('knows equal weights', () => {
    expect(activeWeightPreset(familyProfiles())).toEqual({ preset: 'po_rowno', focusId: null })
  })

  it('knows the children preset: only toddlers and children at 2', () => {
    const profiles = withWeights({ [PROFILE_IDS.zosia]: 2, [PROFILE_IDS.antek]: 2 })
    expect(activeWeightPreset(profiles)).toEqual({ preset: 'pod_dzieci', focusId: null })
  })

  it("knows a person's day and whose it is", () => {
    const profiles = withWeights({ [PROFILE_IDS.babcia]: 2 })
    expect(activeWeightPreset(profiles)).toEqual({
      preset: 'dzien_babci',
      focusId: PROFILE_IDS.babcia,
    })
  })

  it('calls anything else custom', () => {
    expect(activeWeightPreset(withWeights({ [PROFILE_IDS.tata]: 3 }))).toBeNull()
    expect(
      activeWeightPreset(withWeights({ [PROFILE_IDS.mama]: 2, [PROFILE_IDS.tata]: 2 })),
    ).toBeNull()
    expect(activeWeightPreset([])).toBeNull()
  })
})

describe('defaultFocus', () => {
  it('prefers the senior, else the oldest person', () => {
    expect(defaultFocus(familyProfiles())).toBe(PROFILE_IDS.babcia)
    expect(defaultFocus(familyProfiles().filter((p) => p.age_group !== 'senior'))).toBe(
      PROFILE_IDS.tata,
    )
    expect(defaultFocus([])).toBeNull()
  })
})

describe('floorShare', () => {
  it('puts the floor on the r axis with the same formula as r, capped at 1', () => {
    expect(floorShare(40, 90)).toBeCloseTo(0.5)
    expect(floorShare(80, 60)).toBe(1)
  })
})

describe('planChange', () => {
  it('reports min r and r per person in points, and no change as unchanged', () => {
    const before = plan()
    expect(planChange(before, before).unchanged).toBe(true)

    const [first, ...rest] = familyFairness()
    if (!first) throw new Error('no people')
    const after = plan(undefined, {
      plan_hash: 'ffffffffffff',
      fairness: {
        ...before.fairness,
        min_r: before.fairness.min_r + 0.04,
        per_person: [{ ...first, r: first.r - 0.1 }, ...rest],
      },
    })
    const change = planChange(before, after)
    expect(change.minR).toBe(4)
    expect(change.perPerson.get(first.profile_id)).toBe(-10)
    expect(change.unchanged).toBe(false)
  })

  it('counts the cost and the time on the way', () => {
    const before = plan()
    const after = plan(undefined, { budget: { ...before.budget, cost: '1390.00' } })
    expect(planChange(before, after).cost).toBe(-90)
    expect(transferMinutes(before)).toBe(12 + 25 + 18 + 20)
  })
})
