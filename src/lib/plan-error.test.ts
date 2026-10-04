import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { classifyPlanFailure } from './plan-error'

describe('classifyPlanFailure', () => {
  it('knows the missing catalog and its job', () => {
    const error = new ApiError(409, { code: 'catalog_missing', job_id: 'wf-1' })
    expect(classifyPlanFailure(error)).toEqual({ kind: 'catalog_missing', jobId: 'wf-1' })
  })

  it('knows a trip without a city, as text or as a code', () => {
    expect(classifyPlanFailure(new ApiError(422, 'The trip needs a city to plan'))).toEqual({
      kind: 'city_missing',
    })
    expect(classifyPlanFailure(new ApiError(422, { code: 'city_missing' }))).toEqual({
      kind: 'city_missing',
    })
  })

  it('shows the message of the API for other 422 answers', () => {
    expect(classifyPlanFailure(new ApiError(422, "Unknown city 'x'"))).toEqual({
      kind: 'message',
      text: "Unknown city 'x'",
    })
  })

  it('keeps forbidden and falls back to the generic text', () => {
    expect(classifyPlanFailure(new ApiError(403, undefined))).toEqual({ kind: 'forbidden' })
    expect(classifyPlanFailure(new ApiError(500, undefined))).toEqual({ kind: 'generic' })
    expect(classifyPlanFailure(new TypeError('x'))).toEqual({ kind: 'generic' })
  })
})
