import { useState } from 'react'
import { LATEST } from '@/api/queries/notifications'
import type { NotificationMenuProps } from '@/lib/notification-menu'
import { useMarkNotifications } from './use-mark-notifications'
import { useNotificationActions } from './use-notification-actions'
import { useNotifications } from './use-notifications'
import { useOpenNotification } from './use-open-notification'
import type { SessionStatus } from './use-session'
import { useUnreadCount } from './use-unread-count'

/** Everything the bell and its panel show, or null when nobody is signed in (no bell at all). */
export function useNotificationMenu(
  sessionStatus: SessionStatus,
  isDesktop: boolean,
): NotificationMenuProps | null {
  const [open, setOpen] = useState(false)
  // The bell is for signed-in users only: nobody else fetches anything.
  const active: SessionStatus = sessionStatus === 'authenticated' ? sessionStatus : 'anonymous'
  const unread = useUnreadCount(active)
  const latest = useNotifications(LATEST, active)
  const mark = useMarkNotifications()
  const actions = useNotificationActions(() => setOpen(false))
  const openDetails = useOpenNotification()

  if (active !== 'authenticated') return null

  return {
    isDesktop,
    open,
    onOpenChange: (next) => {
      setOpen(next)
      // Opening shows what is on the server now, not what was fetched a minute ago.
      if (next) latest.refetch()
    },
    unread,
    notifications: latest.notifications,
    isPending: latest.isPending,
    hasError: latest.problem !== null,
    onRetry: latest.refetch,
    // Opening the panel marks nothing; only this button does.
    onMarkAllRead: () => mark.mutate({ body: { read: true, filters: { read: false } } }),
    markingAll: mark.isPending,
    onOpenNotification: (notification) => {
      setOpen(false)
      openDetails(notification.id)
    },
    onRunAction: actions.run,
  }
}
