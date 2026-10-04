import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { type DecisionsSearch, decisionsQueryOptions } from '@/api/queries/decisions'

/** One page of the decision log, filtered and paged by the server according to the URL. */
export function useDecisionLog(tripId: string, search: DecisionsSearch, enabled: boolean) {
  const query = useQuery({ ...decisionsQueryOptions(tripId, search), enabled })
  return {
    decisions: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    /** Pages of the answer to *this* search; undefined while the previous page is shown instead. */
    pages: query.isPlaceholderData ? undefined : query.data?.pages,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    isPlaceholder: query.isPlaceholderData,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
