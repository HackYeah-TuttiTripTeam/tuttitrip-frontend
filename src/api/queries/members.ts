import { $api, type Schemas } from '@/api/client'

export type Member = Schemas['MemberRead']

export const membersQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/members', {
    params: { path: { trip_id: tripId } },
  })
