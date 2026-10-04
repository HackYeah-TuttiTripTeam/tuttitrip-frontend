import { useQuery } from '@tanstack/react-query'
import { ApiError, classifyApiError } from '@/api/errors'
import { proposalQueryOptions } from '@/api/queries/proposals'

/**
 * The proposal sent last. A 404 is not an error: nothing was sent yet (`hasNone`). A 403 means the
 * caller may not see proposals, which the plan tab simply leaves out (`forbidden`).
 */
export function useProposal(tripId: string) {
  const query = useQuery({
    ...proposalQueryOptions(tripId),
    retry: (count, error) => !(error instanceof ApiError) && count < 2,
  })
  const problem = query.isError ? classifyApiError(query.error) : null

  return {
    proposal: query.data,
    isPending: query.isPending,
    hasNone: problem === 'not_found',
    forbidden: query.error instanceof ApiError && query.error.status === 403,
    problem: problem === 'not_found' ? null : problem,
    refetch: () => void query.refetch(),
  }
}
