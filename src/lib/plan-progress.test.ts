import { describe, expect, it } from 'vitest'
import { PLAN_PROGRESS_STEPS, stepStates } from './plan-progress'

const states = (current: Parameters<typeof stepStates>[0]) =>
  stepStates(current).map((s) => s.state)

describe('stepStates', () => {
  it('lists the stages in the order of the algorithm', () => {
    expect(PLAN_PROGRESS_STEPS).toEqual([
      'catalogue',
      'reference',
      'search',
      'floors',
      'budget',
      'verdicts',
    ])
  })

  it('treats the first stage as current before the first answer', () => {
    expect(states(null)).toEqual(['current', 'pending', 'pending', 'pending', 'pending', 'pending'])
  })

  it('marks the earlier stages done and the later ones remaining', () => {
    expect(states('search')).toEqual(['done', 'done', 'current', 'pending', 'pending', 'pending'])
    expect(states('verdicts')).toEqual(['done', 'done', 'done', 'done', 'done', 'current'])
  })

  it('counts a skipped stage as done once a later one runs', () => {
    // One traveller: no reference runs, the first event is the search.
    expect(states('search')[1]).toBe('done')
  })
})
