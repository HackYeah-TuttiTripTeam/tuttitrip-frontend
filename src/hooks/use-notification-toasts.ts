import { toast } from 'sonner'
import type { Notification } from '@/api/queries/notifications'
import { resolveActions } from '@/lib/notification-actions'
import { claimToast } from '@/lib/notification-channel'
import { describeNotification } from '@/lib/notification-copy'
import { m } from '@/paraglide/messages'
import { useNotificationActions } from './use-notification-actions'
import { useOpenNotification } from './use-open-notification'

/** Time on screen: a decision waits longer than news. */
const DECISION_MS = 10_000
const NEWS_MS = 6_000
/** Older than this when it arrives (a replay after a reconnect): it waits in the bell, no toast. */
const TOO_OLD_MS = 30_000
const isDecision = (notification: Notification) =>
  notification.actions.some(({ code }) => code.startsWith('approve_'))

/**
 * A toast for a notification that just arrived on the stream. Only in a visible tab (a hidden one
 * leaves it in the bell); the toast id is the notification id, so a repeat updates it instead of
 * stacking. Acting runs the first supported action and reads the notification; "Details" opens
 * the dialog (which reads it); closing and timing out change nothing, so it stays unread.
 */
export function useNotificationToasts() {
  const actions = useNotificationActions()
  const openDetails = useOpenNotification()

  return (notification: Notification) => {
    if (document.visibilityState !== 'visible') return
    if (Date.now() - Date.parse(notification.created_at) > TOO_OLD_MS) return
    // One tab shows it; the others, which got the same event, stay quiet.
    if (!claimToast(notification.id)) return
    const { title, body } = describeNotification(notification)
    const [first] = resolveActions(notification)
    toast(title, {
      id: notification.id,
      description: body || undefined,
      duration: isDecision(notification) ? DECISION_MS : NEWS_MS,
      // Two buttons at most: the first supported action, and the full notification.
      ...(first && {
        action: { label: first.label, onClick: () => actions.run(notification, first) },
      }),
      cancel: { label: m.notif_toast_details(), onClick: () => openDetails(notification.id) },
    })
  }
}
