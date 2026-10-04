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
