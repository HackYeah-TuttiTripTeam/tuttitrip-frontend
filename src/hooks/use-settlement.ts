import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { settlementQueryOptions } from '@/api/queries/settlement'
import type { SessionStatus } from './use-session'

/** Balances and transfers of a trip, exactly as the API computed them (nothing is summed here). */
export function useSettlement(tripId: string, sessionStatus: SessionStatus, enabled = true) {
  const query = useQuery({
    ...settlementQueryOptions(tripId),
    enabled: enabled && (sessionStatus === 'authenticated' || sessionStatus === 'disabled'),
  })
  return {
    settlement: query.data,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
