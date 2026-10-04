import { TriangleAlert } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import type { NotificationMenuProps } from '@/lib/notification-menu'
import { m } from '@/paraglide/messages'
import { NotificationBell } from './notification-bell'
import { NotificationListItem } from './notification-list-item'

function Panel({
  unread,
  notifications,
  isPending,
  hasError,
  onRetry,
  onMarkAllRead,
  markingAll,
  onOpenNotification,
  onRunAction,
  onOpenChange,
}: NotificationMenuProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="font-medium text-sm">{m.notif_title()}</h2>
        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={markingAll}
            onClick={onMarkAllRead}
            className="h-11 md:h-8"
          >
            {m.notif_mark_all_read()}
          </Button>
        )}
      </div>

      {isPending ? (
        <div aria-hidden="true" className="flex flex-col gap-3 p-3">
          {['a', 'b', 'c'].map((key) => (
            <div key={key} className="flex gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : hasError ? (
        <div role="alert" className="flex flex-col items-start gap-2 p-4 text-sm">
          <TriangleAlert aria-hidden="true" className="size-5 text-muted-foreground" />
          <p className="text-muted-foreground">{m.notif_load_failed()}</p>
          <Button variant="outline" size="sm" onClick={onRetry} className="h-11 md:h-8">
            {m.action_retry()}
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <p className="p-6 text-center text-muted-foreground text-sm">{m.notif_empty_title()}</p>
      ) : (
        <ul className="max-h-[60dvh] overflow-y-auto md:max-h-96">
          {notifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              onOpen={onOpenNotification}
              onAction={onRunAction}
            />
          ))}
        </ul>
      )}

      <div className="border-t p-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 w-full md:h-9"
          onClick={() => onOpenChange(false)}
        >
          <Link to="/notifications">{m.notif_see_more()}</Link>
        </Button>
      </div>
    </div>
  )
}

/** The bell and its panel: the last few notifications, "mark all read" and "see more". */
export function NotificationMenu(props: NotificationMenuProps) {
  const { isDesktop, open, onOpenChange, unread } = props

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <NotificationBell unread={unread} />
        </PopoverTrigger>
        <PopoverContent align="end" aria-label={m.notif_title()} className="w-96 p-0">
          <Panel {...props} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      <NotificationBell unread={unread} onClick={() => onOpenChange(true)} />
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>{m.notif_title()}</DrawerTitle>
            <DrawerDescription>{m.notif_drawer_description()}</DrawerDescription>
          </DrawerHeader>
          <Panel {...props} />
        </DrawerContent>
      </Drawer>
    </>
  )
}
