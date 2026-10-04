import { useQuery } from '@tanstack/react-query'
import { paymentsQueryOptions } from '@/api/queries/settlement'
import type { SessionStatus } from './use-session'

/** The payments marked as made (one fixed page); an error only hides the list, the transfers stay. */
export function usePayments(tripId: string, sessionStatus: SessionStatus, enabled = true) {
  const query = useQuery({
    ...paymentsQueryOptions(tripId),
    enabled: enabled && (sessionStatus === 'authenticated' || sessionStatus === 'disabled'),
  })
  return { payments: query.data?.items ?? [], total: query.data?.total ?? 0 }
}
