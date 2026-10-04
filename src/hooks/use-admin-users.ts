import { useQuery } from '@tanstack/react-query'
import { ApiError, classifyApiError } from '@/api/errors'
import { adminUsersQueryOptions } from '@/api/queries/admin-users'
import type { AdminUsersSearch } from '@/loaders/admin-users'

/** One page of accounts, searched, filtered and sorted by the server according to the URL. */
export function useAdminUsers(search: AdminUsersSearch, enabled: boolean) {
  const query = useQuery({ ...adminUsersQueryOptions(search), enabled })
  return {
    users: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    /** Pages of the answer to *this* search; undefined while the previous page is shown instead. */
    pages: query.isPlaceholderData ? undefined : query.data?.pages,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    isPlaceholder: query.isPlaceholderData,
    problem: query.isError ? classifyApiError(query.error) : null,
    /** HTTP status of a failed load: 403 (no access any more), 502/503 (Auth0 is not answering). */
    errorStatus: query.error instanceof ApiError ? query.error.status : null,
    refetch: () => void query.refetch(),
  }
}
