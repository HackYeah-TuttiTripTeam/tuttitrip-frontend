import { useQuery } from '@tanstack/react-query'
import { unreadCountQueryOptions } from '@/api/queries/notifications'
import { useNotificationStore } from '@/stores/notification-store'
import type { SessionStatus } from './use-session'

/** The number on the bell. Zero while unknown or signed out: a missing counter hides the badge. */
export function useUnreadCount(sessionStatus: SessionStatus) {
  const streamOpen = useNotificationStore((state) => state.streamStatus === 'open')
  const query = useQuery({
    ...unreadCountQueryOptions(streamOpen),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
    retry: false,
  })
  return query.data?.count ?? 0
}
