import { useNavigate } from '@tanstack/react-router'
import type { Notification } from '@/api/queries/notifications'
import { type ResolvedAction, resolveActions } from '@/lib/notification-actions'
import { useMarkNotifications } from './use-mark-notifications'

/**
 * What a click on a notification does. An action opens its target and marks the notification read;
 * a click on the row itself runs the first action the client supports, or only marks it read.
 * Already-read notifications are not marked again.
 */
export function useNotificationActions(onNavigate?: () => void) {
  const navigate = useNavigate()
  const { mutate } = useMarkNotifications()

  const markRead = (notification: Notification) => {
    if (notification.read_at === null) mutate({ body: { read: true, ids: [notification.id] } })
  }

  const run = (notification: Notification, action: ResolvedAction) => {
    markRead(notification)
    onNavigate?.()
    void navigate({
      to: '/trips/$tripId',
      params: { tripId: action.target.tripId },
      search: { tab: action.target.tab },
    })
  }

  return {
    run,
    open: (notification: Notification) => {
      const [first] = resolveActions(notification)
      if (first) run(notification, first)
      else markRead(notification)
    },
  }
}
