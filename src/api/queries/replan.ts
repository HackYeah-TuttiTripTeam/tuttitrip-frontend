import { $api } from '@/api/client'
import type { PendingSchemas } from '@/api/pending-paths'

export type Replan = PendingSchemas['Replan']
export type ReplanChange = PendingSchemas['ReplanChange']

/** The changes of members that touch other people and wait for the host (a short list, no paging). */
export const PENDING_REPLANS_STATUS = 'pending_host'

export const pendingReplansQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/replans', {
    params: { path: { trip_id: tripId }, query: { status: PENDING_REPLANS_STATUS } },
  })

export const pendingReplansKey = (tripId: string) => pendingReplansQueryOptions(tripId).queryKey
