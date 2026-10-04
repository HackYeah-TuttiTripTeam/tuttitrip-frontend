import { describe, expect, it } from 'vitest'
import { forcedPlaces, poolRemaining, samePool, stepPool } from './importance'

const even = { lodging: 2, food: 2, attractions: 2, pace: 2, cost: 2 }

describe('forcedPlaces (k of E5)', () => {
  it.each([
    [0, 0],
    [3, 0],
    [4, 1],
    [6, 1],
    // 0.7 gives 0.99999 in floating point: this is the point of the integer maths
    [7, 2],
    [9, 2],
    [10, 3],
  ])('%i points force %i places', (points, places) => {
    expect(forcedPlaces(points)).toBe(places)
  })
})

describe('stepPool', () => {
  it('takes a point from one domain and leaves the rest', () => {
    const next = stepPool(even, 'food', -1)
    expect(next).toEqual({ ...even, food: 1 })
    expect(poolRemaining(next)).toBe(1)
  })

  it('never goes over the total or below zero', () => {
    expect(stepPool(even, 'food', 1)).toEqual(even)
    expect(stepPool({ ...even, food: 0 }, 'food', -1).food).toBe(0)
  })

  it('gives at most the points that are free', () => {
    const free = { lodging: 0, food: 0, attractions: 2, pace: 2, cost: 2 }
    expect(stepPool(free, 'food', 10).food).toBe(4)
  })

  it('compares pools', () => {
    expect(samePool(even, { ...even })).toBe(true)
    expect(samePool(even, { ...even, food: 3 })).toBe(false)
  })
})
