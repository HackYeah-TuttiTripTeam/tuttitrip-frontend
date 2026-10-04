import type { Notification } from '@/api/queries/notifications'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/format'
import { type ResolvedAction, resolveActions } from '@/lib/notification-actions'
import { describeNotification, notificationTypeLabel } from '@/lib/notification-copy'
import { m } from '@/paraglide/messages'
import { NotificationIcon } from './notification-icon'

interface NotificationDialogProps {
  /** The notification to show; null with `open` means it could not be found. */
  notification: Notification | null
  open: boolean
  isDesktop: boolean
  tripName: string | null
  onClose: () => void
  onAction: (notification: Notification, action: ResolvedAction) => void
  onToggleRead: (notification: Notification) => void
}

/**
 * The full notification: text, type, trip, date and its actions as buttons. Radix traps the focus
 * inside, Esc closes it and the focus goes back to the row that opened it.
 */
export function NotificationDialog({
  notification,
  open,
  isDesktop,
  tripName,
  onClose,
  onAction,
  onToggleRead,
}: NotificationDialogProps) {
  const onOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

  if (!notification) {
    return (
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        isDesktop={isDesktop}
        title={m.notif_dialog_missing_title()}
        description={m.notif_dialog_missing_body()}
      >
        <div className="pb-4" />
      </ResponsiveModal>
    )
  }

  const { title, body, icon } = describeNotification(notification)
  const actions = resolveActions(notification)
  const unread = notification.read_at === null

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      isDesktop={isDesktop}
      title={title}
      description={`${formatDate(notification.created_at)}, ${formatTime(notification.created_at)}`}
    >
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex items-start gap-3">
          <NotificationIcon name={icon} />
          <div className="flex min-w-0 flex-col gap-2">
            {body && <p className="text-sm leading-relaxed">{body}</p>}
            <p className="text-muted-foreground text-sm">
              {m.notif_dialog_type({ type: notificationTypeLabel(notification.type) })}
            </p>
            {tripName && (
              <p className="text-muted-foreground text-sm">
                {m.notif_dialog_trip({ trip: tripName })}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {actions.map((action) => (
            <Button
              key={action.code}
              onClick={() => onAction(notification, action)}
              className="h-11 md:h-9"
            >
              {action.label}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => onToggleRead(notification)}
            className="h-11 md:h-9"
          >
            {unread ? m.notif_mark_read() : m.notif_mark_unread()}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
