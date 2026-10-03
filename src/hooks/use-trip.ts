import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { tripQueryOptions } from '@/api/queries/trips'
import type { SessionStatus } from './use-session'

/** One trip by id. A 404 (missing trip or not a member) comes back as problem "not_found". */
export function useTrip(tripId: string, sessionStatus: SessionStatus) {
  const query = useQuery({
    ...tripQueryOptions(tripId),
    // With auth disabled we still try, so a backend without auth works locally.
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
  })

  return {
    trip: query.data,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
