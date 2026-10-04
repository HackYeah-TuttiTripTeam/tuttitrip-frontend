import type { Notification } from '@/api/queries/notifications'
import type { ResolvedAction } from './notification-actions'

export interface NotificationMenuProps {
  /** Popover on desktop, a bottom drawer (vaul) on phones. */
  isDesktop: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  unread: number
  /** The latest few, newest first. */
  notifications: Notification[]
  isPending: boolean
  hasError: boolean
  onRetry: () => void
  onMarkAllRead: () => void
  markingAll: boolean
  onOpenNotification: (notification: Notification) => void
  onRunAction: (notification: Notification, action: ResolvedAction) => void
}
