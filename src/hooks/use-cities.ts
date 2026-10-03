import { useQuery } from '@tanstack/react-query'
import { citiesQueryOptions } from '@/api/queries/cities'
import type { SessionStatus } from './use-session'

/** The city catalogue; an empty list while loading or when the account may not read it. */
export function useCities(sessionStatus: SessionStatus) {
  const query = useQuery({
    ...citiesQueryOptions(),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
    retry: false,
  })
  return { cities: query.data ?? [], isPending: query.isPending && query.fetchStatus !== 'idle' }
}
