import { describe, expect, it } from 'vitest'
import type { Preferences } from '@/api/queries/preferences'
import {
  addAllergy,
  applyWrite,
  pickedInterests,
  removeAllergy,
  setDietTag,
  setInterest,
  toWrite,
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
  it('leaves rated places (with a place_id) out, so a PUT never re-saves ratings', () => {
    const body = toWrite(
      read({
        example_places: [
          { name: 'Zamek', verdict: 'like', place_id: 'abc' },
          { name: 'Moja ulubiona kawiarnia', verdict: 'like', place_id: null },
        ],
      }),
    )
    expect(body.example_places).toEqual([
      { name: 'Moja ulubiona kawiarnia', verdict: 'like', place_id: null },
    ])
  })

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
  it('shows the body at once', () => {
    const next = applyWrite(read(), { diet: { tags: ['halal'], allergies: [] } })
    expect(next.diet).toEqual({ tags: ['halal'], allergies: [] })
    expect(next.interests).toEqual(read().interests)
  })
})

describe('interests', () => {
  it('ticks a tag with full strength and keeps the strength of one already there', () => {
    expect(setInterest({}, 'art', true)).toEqual({ art: 1 })
    expect(setInterest({ art: 0.4 }, 'art', true)).toEqual({ art: 0.4 })
  })

  it('unticks one tag and leaves the others, known or not', () => {
    const interests = { art: 1, future_tag: 0.7 } as unknown as Preferences['interests']
    expect(setInterest(interests, 'art', false)).toEqual({ future_tag: 0.7 })
  })

  it('lists ticked tags in the given order and ignores zero strength', () => {
    expect(
      pickedInterests({ parks: 1, art: 0, history: 0.2 }, ['history', 'art', 'parks']),
    ).toEqual(['history', 'parks'])
  })
})

describe('diet', () => {
  it('ticks and unticks a diet, and removes an allergy', () => {
    const diet = { tags: ['vegan' as const], allergies: ['seler', 'orzechy'] }
    expect(setDietTag(diet, 'halal', true).tags).toEqual(['vegan', 'halal'])
    expect(setDietTag(diet, 'vegan', false).tags).toEqual([])
    expect(removeAllergy(diet, 'seler').allergies).toEqual(['orzechy'])
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
