import { useQuery } from '@tanstack/react-query'
import { type TripsSearch, tripsQueryOptions } from '@/api/queries/trips'
import type { SessionStatus } from './use-session'

/** Up to 100 of the user's trips by name: the trip filter and the trip column of the history. */
const ALL_BY_NAME: TripsSearch = { page: 1, size: 100, sort: 'name', dir: 'asc', q: '', role: [] }

export function useTripOptions(sessionStatus: SessionStatus) {
  const query = useQuery({
    ...tripsQueryOptions(ALL_BY_NAME),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
    retry: false,
  })
  const trips = (query.data?.items ?? []).map(({ id, name }) => ({ id, name }))
  const names = new Map(trips.map((trip) => [trip.id, trip.name]))
  return { trips, tripName: (id: string | null) => (id ? (names.get(id) ?? null) : null) }
}
