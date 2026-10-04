import { $api, type Schemas } from '@/api/client'

export type Settlement = Schemas['SettlementRead']
export type SettlementBalance = Schemas['BalanceRead']
export type SettlementTransfer = Schemas['TransferRead']

export const settlementQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/expenses/settlement', {
    params: { path: { trip_id: tripId } },
  })

/** Key of a trip's settlement, for invalidation after an expense write. */
export const settlementKey = (tripId: string) => settlementQueryOptions(tripId).queryKey

export type Payment = Schemas['PaymentRead']
export type PaymentCreate = Schemas['PaymentCreate']

/** The payments shown under the transfers: one fixed page, newest first (the API's default sort). */
export const PAYMENTS_PAGE_SIZE = 50

export const paymentsQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/expenses/settlement/payments', {
    params: { path: { trip_id: tripId }, query: { page: 1, size: PAYMENTS_PAGE_SIZE } },
  })

/** Key prefix of a trip's payments, for invalidation after marking or removing one. */
export const paymentsKey = (tripId: string) => paymentsQueryOptions(tripId).queryKey
