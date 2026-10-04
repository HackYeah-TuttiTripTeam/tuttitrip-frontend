import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { type NotificationsSearch, notificationsQueryOptions } from '@/api/queries/notifications'
import type { SessionStatus } from './use-session'

const canCall = (status: SessionStatus) => status === 'authenticated' || status === 'disabled'

/** One page of notifications, filtered and sorted by the server according to `search`. */
export function useNotifications(
  search: NotificationsSearch,
  sessionStatus: SessionStatus,
  enabled = true,
) {
  const query = useQuery({
    ...notificationsQueryOptions(search),
    enabled: enabled && canCall(sessionStatus),
  })

  return {
    notifications: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    /** Pages of the answer to *this* search; undefined while the previous page is shown instead. */
    pages: query.isPlaceholderData ? undefined : query.data?.pages,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    /** An answer (or an error) for this search has arrived. */
    isSettled: query.isSuccess || query.isError,
    isPlaceholder: query.isPlaceholderData,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
