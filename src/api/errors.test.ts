import { describe, expect, it } from 'vitest'
import { classifyApiError } from './errors'

describe('classifyApiError', () => {
  it('maps the API answers to something the UI can explain', () => {
    expect(classifyApiError(new TypeError('Failed to fetch'))).toBe('offline')
    expect(classifyApiError({ detail: 'Invalid token' })).toBe('unauthorized')
    expect(classifyApiError({ detail: 'Trip not found' })).toBe('not_found')
    expect(classifyApiError({ detail: [{ loc: ['path', 'trip_id'], type: 'uuid_parsing' }] })).toBe(
      'not_found',
    )
    expect(classifyApiError({ detail: [{ loc: ['body', 'name'] }] })).toBe('unknown')
    expect(classifyApiError({ detail: 'boom' })).toBe('unknown')
  })
})
