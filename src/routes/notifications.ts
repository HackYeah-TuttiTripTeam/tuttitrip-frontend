import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import {
  loadNotifications,
  notificationsSearchDefaults,
  notificationsSearchSchema,
} from '@/loaders/notifications'
import { NotificationsView } from '@/views/notifications-view'

export const Route = createFileRoute('/notifications')({
  validateSearch: notificationsSearchSchema,
  search: { middlewares: [stripSearchParams(notificationsSearchDefaults)] },
  loaderDeps: ({ search }) => search,
  loader: loadNotifications,
  component: NotificationsView,
})
