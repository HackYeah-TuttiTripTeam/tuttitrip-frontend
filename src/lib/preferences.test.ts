import { describe, expect, it } from 'vitest'
import type { Preferences } from '@/api/queries/preferences'
import {
  addAllergy,
  applyWrite,
  pickedInterests,
  toWrite,
  withPickedInterests,
} from './preferences'

const read = (overrides: Partial<Preferences> = {}): Preferences => ({
  profile_id: 'p',
  interests: { history: 1, parks: 0.5 },
  diet: { tags: ['vegan'], allergies: ['orzechy'] },
  example_places: [{ name: 'Zamek', verdict: 'like', place_id: null }],
  min_tags: [],
  importance_pool: { lodging: 2, food: 2, attractions: 2, pace: 2, cost: 2 },
  constraints: {
    wheelchair: false,
    stairs: true,
    heat: false,
    cold: false,
    audio_description: false,
  },
  effective_stairs_sensitivity: 1,
  filled: true,
  updated_by_sub: null,
  updated_at: null,
  ...overrides,
})

describe('toWrite', () => {
  it('sends back everything saved, so a PUT never wipes the rest', () => {
    expect(toWrite(read(), { diet: { tags: [], allergies: [] } })).toEqual({
      interests: { history: 1, parks: 0.5 },
      diet: { tags: [], allergies: [] },
      example_places: [{ name: 'Zamek', verdict: 'like', place_id: null }],
      min_tags: [],
      constraints: {
        wheelchair: false,
        stairs: true,
        heat: false,
        cold: false,
        audio_description: false,
      },
      importance_pool: { lodging: 2, food: 2, attractions: 2, pace: 2, cost: 2 },
    })
  })

  it('leaves the pool out until someone saved it, and the constraints out when hidden', () => {
    const body = toWrite(read({ filled: false, constraints: null }))
    expect(body).not.toHaveProperty('importance_pool')
    expect(body).not.toHaveProperty('constraints')
  })
})

describe('applyWrite', () => {
  it('shows the body at once and the stricter stairs for the solver', () => {
    const next = applyWrite(
      read({
        effective_stairs_sensitivity: 0.2,
        constraints: {
          wheelchair: false,
          stairs: false,
          heat: false,
          cold: false,
          audio_description: false,
        },
      }),
      {
        constraints: {
          wheelchair: true,
          stairs: false,
          heat: false,
          cold: false,
          audio_description: false,
        },
      },
    )
    expect(next.constraints?.wheelchair).toBe(true)
    expect(next.effective_stairs_sensitivity).toBe(1)
    expect(next.diet).toEqual(read().diet)
  })
})

describe('interests', () => {
  it('ticks a tag with full strength, keeps the strength of one that stays, drops the rest', () => {
    const known = ['art', 'parks', 'history'] as const
    expect(withPickedInterests({ parks: 0.4, history: 1 }, known, ['art', 'parks'])).toEqual({
      art: 1,
      parks: 0.4,
    })
  })

  it('leaves tags the screen does not know alone', () => {
    const interests = { future_tag: 0.7, art: 1 } as unknown as Parameters<
      typeof withPickedInterests
    >[0]
    expect(withPickedInterests(interests, ['art'], [])).toEqual({ future_tag: 0.7 })
  })

  it('lists ticked tags in the given order and ignores zero strength', () => {
    expect(
      pickedInterests({ parks: 1, art: 0, history: 0.2 }, ['history', 'art', 'parks']),
    ).toEqual(['history', 'parks'])
  })
})

describe('addAllergy', () => {
  it('trims and appends', () => {
    expect(addAllergy({ tags: [], allergies: ['orzechy'] }, '  seler ')).toEqual({
      tags: [],
      allergies: ['orzechy', 'seler'],
    })
  })

  it('ignores blanks, duplicates in any case and over-long text', () => {
    const diet = { tags: [], allergies: ['Orzechy'] }
    expect(addAllergy(diet, '  ')).toBe(diet)
    expect(addAllergy(diet, 'orzechy')).toBe(diet)
    expect(addAllergy(diet, 'x'.repeat(61))).toBe(diet)
  })
})
