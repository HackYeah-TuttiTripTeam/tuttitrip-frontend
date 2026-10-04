import { useQuery } from '@tanstack/react-query'
import { ApiError, classifyApiError } from '@/api/errors'
import { type ExpensesSearch, expensesQueryOptions } from '@/api/queries/expenses'
import type { SessionStatus } from './use-session'

/** One page of a trip's expenses, filtered and sorted by the server according to the URL. */
export function useExpenses(tripId: string, search: ExpensesSearch, sessionStatus: SessionStatus) {
  const query = useQuery({
    ...expensesQueryOptions(tripId, search),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
  })

  return {
    expenses: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    /** Pages of the answer to *this* search; undefined while the previous page is shown instead. */
    pages: query.isPlaceholderData ? undefined : query.data?.pages,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    isPlaceholder: query.isPlaceholderData,
    problem: query.isError ? classifyApiError(query.error) : null,
    forbidden: query.error instanceof ApiError && query.error.status === 403,
    refetch: () => void query.refetch(),
  }
}
