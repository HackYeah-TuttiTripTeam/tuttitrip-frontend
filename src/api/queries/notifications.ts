import { $api, type Schemas } from '@/api/client'
import { type Page, pagedQueryOptions } from './paged'

export type Notification = Schemas['NotificationRead']
export type NotificationAction = Schemas['NotificationAction']
export type NotificationsPage = Page<Notification>
export type NotificationFilter = Schemas['NotificationFilter']
export type NotificationMark = Schemas['NotificationMark']

/** Prefix of every notifications query (lists and the counter), for invalidation after a write. */
export const NOTIFICATIONS_PATH = '/api/v1/notifications'
/** The exact key of the counter, as the generated query builds it. */
export const unreadCountKey = $api.queryOptions(
  'get',
  '/api/v1/notifications/unread-count',
).queryKey

/** What the history page sends: the validated URL search (see loaders/notifications.ts). */
export interface NotificationsSearch {
  page: number
  size: number
  sort: Schemas['NotificationSort']
  dir: Schemas['SortDir']
  read: 'all' | 'unread' | 'read'
  type: string[]
  trip?: string | undefined
  /** Local days, `YYYY-MM-DD`. */
  from?: string | undefined
  to?: string | undefined
}

/** The start of a local calendar day as the UTC moment the API compares against. */
function startOfLocalDay(day: string, plusDays = 0): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date + plusDays).toISOString()
}

/**
 * The filters of the URL as the API's filter object: `from` is the start of that day, `to` the
 * start of the next one (the API's `created_to` is exclusive). Empty filters are left out.
 */
export function notificationFilter({
  read,
  type,
  trip,
  from,
  to,
}: Pick<NotificationsSearch, 'read' | 'type' | 'trip' | 'from' | 'to'>): NotificationFilter {
  return {
    ...(read !== 'all' && { read: read === 'read' }),
    ...(type.length > 0 && { type }),
    ...(trip && { trip_id: trip }),
    ...(from && { created_from: startOfLocalDay(from) }),
    ...(to && { created_to: startOfLocalDay(to, 1) }),
  }
}

export const notificationsApiQuery = ({
  page,
  size,
  sort,
  dir,
  ...filters
}: NotificationsSearch) => ({
  page,
  size,
  sort,
  dir,
  ...notificationFilter(filters),
})

export const notificationsQueryOptions = (search: NotificationsSearch) =>
  pagedQueryOptions(
    $api.queryOptions('get', '/api/v1/notifications', {
      params: { query: notificationsApiQuery(search) },
    }),
  )

/** One notification of the caller (404 when it is missing or someone else's): the `?open=` dialog. */
export const notificationQueryOptions = (id: string) =>
  $api.queryOptions('get', '/api/v1/notifications/{notification_id}', {
    params: { path: { notification_id: id } },
  })

/** The five latest, newest first: the bell panel, a fixed view without URL parameters. */
export const LATEST: NotificationsSearch = {
  page: 1,
  size: 5,
  sort: 'created_at',
  dir: 'desc',
  read: 'all',
  type: [],
}

/**
 * The counter. While the live stream is not open it is polled once a minute (TanStack Query skips
 * the poll in a hidden tab); an open stream keeps it current through its events instead.
 */
export const unreadCountQueryOptions = (streamOpen: boolean) => ({
  ...$api.queryOptions('get', '/api/v1/notifications/unread-count'),
  refetchInterval: streamOpen ? (false as const) : 60_000,
})
