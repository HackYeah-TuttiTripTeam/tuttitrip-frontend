import { type QueryKey, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import {
  NOTIFICATIONS_PATH,
  type Notification,
  type NotificationsPage,
  unreadCountKey,
} from '@/api/queries/notifications'
import { announceMarked } from '@/lib/notification-channel'
import { guessUnreadCount } from '@/lib/notification-count'

const isNotificationsQuery = ({ queryKey }: { queryKey: QueryKey }) =>
  typeof queryKey[1] === 'string' && queryKey[1].startsWith(NOTIFICATIONS_PATH)

/**
 * POST /notifications/mark with `ids` or a `filter`. The counter moves at once when the cache can
 * tell by how much and returns to the server's value on failure; on success every notifications
 * list and the counter are fetched again, so the bell and the history agree.
 */
export function useMarkNotifications() {
  const queryClient = useQueryClient()
  return $api.useMutation('post', '/api/v1/notifications/mark', {
    onMutate: async ({ body }) => {
      await queryClient.cancelQueries({ predicate: isNotificationsQuery })
      // Rows picked by id turn read (or unread) at once; the server's answer replaces them later.
      const lists = queryClient.getQueriesData<NotificationsPage>({
        predicate: isNotificationsQuery,
      })
      if (body.ids) {
        const ids = new Set(body.ids)
        const readAt = body.read ? new Date().toISOString() : null
        for (const [key, page] of lists) {
          if (!page?.items) continue
          queryClient.setQueryData<NotificationsPage>(key, {
            ...page,
            items: page.items.map((item) =>
              ids.has(item.id) ? { ...item, read_at: readAt } : item,
            ),
          })
        }
      }
      const before = queryClient.getQueryData<{ count: number }>(unreadCountKey)
      if (before) {
        // The rows as they were before the optimistic write above: the guess needs their old state.
        const loaded = lists.flatMap(([, page]) => page?.items ?? [])
        const next = guessUnreadCount(before.count, body, dedupe(loaded))
        if (next !== undefined) queryClient.setQueryData(unreadCountKey, { count: next })
      }
      return { before, lists }
    },
    onError: (_error, _variables, context) => {
      for (const [key, page] of context?.lists ?? []) queryClient.setQueryData(key, page)
      if (context?.before) queryClient.setQueryData(unreadCountKey, context.before)
    },
    onSuccess: () => announceMarked(),
    onSettled: () => queryClient.invalidateQueries({ predicate: isNotificationsQuery }),
  })
}

function dedupe(items: Notification[]): Notification[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}
