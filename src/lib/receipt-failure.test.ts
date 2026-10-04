import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { receiptFailure } from './receipt-failure'
import { ReceiptImageError } from './receipt-image'

const unprocessable = (type: string) => new ApiError(422, [{ type, loc: ['body', 'file'] }])

describe('receiptFailure', () => {
  it('tells a dead connection from the API answers', () => {
    expect(receiptFailure(new TypeError('Failed to fetch'))).toBe('offline')
    expect(receiptFailure(new ApiError(503, undefined))).toBe('unavailable')
    expect(receiptFailure(new ApiError(429, undefined))).toBe('too_many')
    expect(receiptFailure(new ApiError(403, undefined))).toBe('forbidden')
    expect(receiptFailure(new ApiError(409, undefined))).toBe('closed')
  })

  it('reads the code of a 422, not its text', () => {
    expect(receiptFailure(unprocessable('receipt.too_large'))).toBe('too_large')
    expect(receiptFailure(unprocessable('receipt.type_not_allowed'))).toBe('type_not_allowed')
    expect(receiptFailure(unprocessable('receipt.empty'))).toBe('unreadable')
  })

  it('keeps the reason of a photo the browser could not shrink', () => {
    expect(receiptFailure(new ReceiptImageError('too_large'))).toBe('too_large')
    expect(receiptFailure(new Error('boom'))).toBe('unknown')
  })
})
