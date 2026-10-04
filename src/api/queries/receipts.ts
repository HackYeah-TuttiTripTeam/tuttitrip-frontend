import { $api, fetchClient, type Schemas } from '@/api/client'

export type ReceiptAccepted = Schemas['ReceiptAccepted']
export type ReceiptState = Schemas['ReceiptState']
export type ReceiptErrorCode = Schemas['ReceiptErrorCode']

/** How often a receipt that is being read is asked about, and when we stop asking. */
export const RECEIPT_POLL_MS = 1500
export const RECEIPT_POLL_LIMIT_MS = 2 * 60 * 1000

/**
 * POST the (already shrunk) image as multipart field `file`. openapi-fetch types the field as a
 * string, so the form is built here from the blob; the browser adds the multipart boundary.
 */
export async function uploadReceipt(tripId: string, image: Blob): Promise<ReceiptAccepted> {
  const { data } = await fetchClient.POST('/api/v1/trips/{trip_id}/expenses/receipts', {
    params: { path: { trip_id: tripId } },
    body: { file: '' },
    bodySerializer: () => {
      const form = new FormData()
      form.append('file', image, 'receipt.jpg')
      return form
    },
  })
  if (!data) throw new Error('Empty answer from the receipt upload')
  return data
}

export const receiptQueryOptions = (tripId: string, evidenceId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/expenses/receipts/{evidence_id}', {
    params: { path: { trip_id: tripId, evidence_id: evidenceId } },
  })

/** The stored photo as a blob (the endpoint needs the bearer token, so an <img src> cannot load it). */
export async function fetchReceiptImage(tripId: string, evidenceId: string): Promise<Blob> {
  const { data } = await fetchClient.GET(
    '/api/v1/trips/{trip_id}/expenses/receipts/{evidence_id}/image',
    { params: { path: { trip_id: tripId, evidence_id: evidenceId } }, parseAs: 'blob' },
  )
  if (!data) throw new Error('Empty answer from the receipt image')
  return data
}
