import { describe, expect, it } from 'vitest'
import { ApiError, classifyApiError } from './errors'

describe('classifyApiError', () => {
  it('maps the status of an API answer to something the UI can explain', () => {
    expect(classifyApiError(new TypeError('Failed to fetch'))).toBe('offline')
    expect(classifyApiError(new ApiError(401, { detail: 'whatever text' }))).toBe('unauthorized')
    expect(classifyApiError(new ApiError(404, 'any wording'))).toBe('not_found')
    expect(classifyApiError(new ApiError(500, undefined))).toBe('unknown')
  })

  it('treats a bad path id (422) as not found, but a bad body as unknown', () => {
    const path = [{ loc: ['path', 'trip_id'], type: 'uuid_parsing' }]
    const body = [{ loc: ['body', 'name'], type: 'missing' }]
    expect(classifyApiError(new ApiError(422, path))).toBe('not_found')
    expect(classifyApiError(new ApiError(422, body))).toBe('unknown')
  })

  it('ignores errors that did not come from the client', () => {
    expect(classifyApiError({ detail: 'Trip not found' })).toBe('unknown')
    expect(classifyApiError(new Error('boom'))).toBe('unknown')
  })
})
