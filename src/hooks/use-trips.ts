import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { tripsQueryOptions } from '@/api/queries/trips'
import type { TripsSearch } from '@/loaders/trips'
import type { SessionStatus } from './use-session'

/** One page of trips, filtered and sorted by the server according to the URL search params. */
export function useTrips(search: TripsSearch, sessionStatus: SessionStatus) {
  const query = useQuery({
    ...tripsQueryOptions(search),
    // With auth disabled we still try, so a backend without auth works locally.
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
  })

  return {
    trips: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    /** Pages of the answer to *this* search; undefined while the previous page is shown instead. */
    pages: query.isPlaceholderData ? undefined : query.data?.pages,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    /** The previous page is still shown while the next one loads. */
    isPlaceholder: query.isPlaceholderData,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
