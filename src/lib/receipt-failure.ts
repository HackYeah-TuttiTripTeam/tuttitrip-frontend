import { ApiError } from '@/api/errors'
import { ReceiptImageError } from './receipt-image'

/** Why a receipt could not be sent or read, as the card explains it. */
export type ReceiptFailure =
  | 'offline'
  | 'unreadable'
  | 'too_large'
  | 'type_not_allowed'
  | 'too_many'
  | 'unavailable'
  | 'forbidden'
  | 'closed'
  | 'unknown'

const HTTP_TOO_MANY = 429
const HTTP_UNAVAILABLE = 503

/** The first `receipt.*` code in a 422 body (the codes, never the text, decide). */
function unprocessableCode(detail: unknown): string | null {
  if (!Array.isArray(detail)) return null
  for (const item of detail) {
    if (typeof item === 'object' && item !== null && 'type' in item) {
      if (typeof item.type === 'string') return item.type
    }
  }
  return null
}

export function receiptFailure(error: unknown): ReceiptFailure {
  if (error instanceof TypeError) return 'offline'
  if (error instanceof ReceiptImageError) return error.reason
  if (!(error instanceof ApiError)) return 'unknown'
  if (error.status === 403) return 'forbidden'
  if (error.status === 409) return 'closed'
  if (error.status === HTTP_TOO_MANY) return 'too_many'
  if (error.status === HTTP_UNAVAILABLE) return 'unavailable'
  if (error.status === 422) {
    const code = unprocessableCode(error.detail)
    if (code === 'receipt.too_large') return 'too_large'
    if (code === 'receipt.type_not_allowed') return 'type_not_allowed'
    if (code === 'receipt.too_many') return 'too_many'
    return 'unreadable'
  }
  return 'unknown'
}
