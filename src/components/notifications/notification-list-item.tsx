import type { Notification } from '@/api/queries/notifications'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/format'
import { type ResolvedAction, resolveActions } from '@/lib/notification-actions'
import { describeNotification } from '@/lib/notification-copy'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { NotificationIcon } from './notification-icon'

interface NotificationListItemProps {
  notification: Notification
  /** The row itself: runs the main action and marks the notification read. */
  onOpen: (notification: Notification) => void
  onAction: (notification: Notification, action: ResolvedAction) => void
}

/** One notification in the bell: icon, text, time, an unread mark and up to two action buttons. */
export function NotificationListItem({
  notification,
  onOpen,
  onAction,
}: NotificationListItemProps) {
  const { title, body, icon } = describeNotification(notification)
  const actions = resolveActions(notification).slice(0, 2)
  const unread = notification.read_at === null

  return (
    <li className="flex flex-col gap-2 border-b px-3 py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="-mx-1 -my-1 flex min-h-11 items-start gap-3 rounded-md p-1 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <NotificationIcon name={icon} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn('text-sm', unread ? 'font-semibold' : 'font-medium')}>{title}</span>
          {body && <span className="text-muted-foreground text-sm">{body}</span>}
          <time
            dateTime={notification.created_at}
            className="text-muted-foreground text-xs tabular-nums"
          >
            {formatRelative(notification.created_at)}
          </time>
        </span>
        {unread && (
          <span
            role="img"
            aria-label={m.notif_unread()}
            className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
          />
        )}
      </button>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-12">
          {actions.map((action) => (
            <Button
              key={action.code}
              variant="outline"
              size="sm"
              className="h-11 md:h-8"
              onClick={() => onAction(notification, action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </li>
  )
}
