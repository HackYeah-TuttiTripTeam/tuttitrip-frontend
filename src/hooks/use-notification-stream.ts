import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { getAuthorization, refreshAuthorization } from '@/api/client'
import { NOTIFICATIONS_PATH, type Notification, unreadCountKey } from '@/api/queries/notifications'
import { openNotificationStream } from '@/lib/notification-stream'
import { getLocale } from '@/paraglide/runtime'
import { useNotificationStore } from '@/stores/notification-store'
import type { SessionStatus } from './use-session'

/**
 * One live connection for the signed-in user (mounted once, in the root layout). `ready` and
 * `resync` refresh the lists and the counter; a `notification` bumps the counter, refreshes the
 * lists and is handed to `onNotification` (the toast). Closes on logout and unmount.
 */
export function useNotificationStream(
  sessionStatus: SessionStatus,
  onNotification: (notification: Notification) => void,
) {
  const queryClient = useQueryClient()
  const setStreamStatus = useNotificationStore((state) => state.setStreamStatus)
  // Always the latest callback, without restarting the connection when it changes.
  const latest = useRef(onNotification)
  latest.current = onNotification

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    const controller = new AbortController()
    const refresh = () =>
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          typeof queryKey[1] === 'string' && queryKey[1].startsWith(NOTIFICATIONS_PATH),
      })

    void openNotificationStream({
      getAuthorization,
      refreshAuthorization,
      acceptLanguage: getLocale,
      signal: controller.signal,
      onStatus: setStreamStatus,
      onEvent: (event) => {
        if (event.type === 'notification') {
          queryClient.setQueryData<{ count: number }>(unreadCountKey, (current) =>
            current ? { count: current.count + 1 } : current,
          )
          latest.current(event.notification)
        }
        // The server's answer wins over the bump above, and the lists show the new row.
        void refresh()
      },
    })
    return () => {
      controller.abort()
      setStreamStatus('connecting')
    }
  }, [sessionStatus, queryClient, setStreamStatus])
}
