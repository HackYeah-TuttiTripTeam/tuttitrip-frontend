import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { CITY_INPUT, classifyPlanFailure, missingCard } from './plan-failure'

const missing = [
  { field: 'dates', kind: 'date_range', person_id: null, options: [] },
  { field: 'people', kind: 'family_builder', person_id: null, options: [] },
]

describe('classifyPlanFailure', () => {
  it('reads the list of missing inputs of a 422 plan.missing_inputs', () => {
    const error = new ApiError(422, { code: 'plan.missing_inputs', message: 'x', missing })
    expect(classifyPlanFailure(error)).toEqual({ kind: 'missing', missing })
  })

  it('asks for the city again when the catalog has no places for it', () => {
    const error = new ApiError(409, { code: 'plan.catalog_empty', message: 'x' })
    expect(classifyPlanFailure(error)).toEqual({ kind: 'catalog_empty', missing: [CITY_INPUT] })
  })

  it.each([
    [new ApiError(403, 'no'), 'forbidden'],
    [new ApiError(500, 'boom'), 'server'],
    [new ApiError(503, 'down'), 'server'],
    [new TypeError('network error'), 'offline'],
    [new ApiError(422, 'plain text of an older API'), 'unknown'],
    [new ApiError(422, { code: 'plan.missing_inputs', missing: [] }), 'unknown'],
  ])('maps %# to %s', (error, kind) => {
    expect(classifyPlanFailure(error)?.kind).toBe(kind)
  })

  it('says nothing failed when there is no error', () => {
    expect(classifyPlanFailure(null)).toBeNull()
  })
})

describe('missingCard', () => {
  it('builds the interview card of the same kind and field', () => {
    const card = missingCard({ field: 'dates', kind: 'date_range', person_id: null, options: [] })
    expect(card).toMatchObject({ kind: 'date_range', field: 'dates', options: [] })
    expect(card.question.length).toBeGreaterThan(0)
  })
})
