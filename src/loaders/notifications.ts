import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import {
  type NotificationsSearch as ApiSearch,
  notificationsQueryOptions,
} from '@/api/queries/notifications'
import {
  NOTIFICATION_READ_FILTERS,
  NOTIFICATION_SORT_KEYS,
  NOTIFICATION_TYPES,
} from '@/lib/notification-copy'
import { createListSearchSchema } from './list-search'
import type { RouterContext } from './router-context'

const optional = <T extends z.ZodType>(type: T) => type.optional().catch(undefined)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/**
 * /notifications?read=&type=&trip=&from=&to=&sort=&dir=&page=&size= — the URL is the single source
 * of truth; the API filters, sorts and pages. Several types are written the way TanStack Router
 * writes arrays (`type=["veto_added","plan_ready"]`); a single `type=veto_added` is read too.
 * `to` before `from` is dropped, so the URL, the filter bar and the request agree.
 */
const { schema, defaults } = createListSearchSchema({
  sortKeys: NOTIFICATION_SORT_KEYS,
  defaultSort: 'created_at',
  defaultDir: 'desc',
  filters: {
    read: z.enum(NOTIFICATION_READ_FILTERS).default('all').catch('all'),
    type: z
      .preprocess(
        (value) => (typeof value === 'string' ? [value] : value),
        z.array(z.enum(NOTIFICATION_TYPES)),
      )
      .default([])
      .catch([]),
    trip: optional(z.uuid()),
    from: optional(day),
    to: optional(day),
    /** The notification shown in the detail dialog; not a filter, so it never resets the page. */
    open: optional(z.uuid()),
  },
})

export const notificationsSearchSchema = schema.transform((search) =>
  search.from && search.to && search.to < search.from ? { ...search, to: undefined } : search,
)
export const notificationsSearchDefaults = defaults
export type NotificationsSearch = z.output<typeof notificationsSearchSchema>

/** The filters of the list without sort and paging. */
export const notificationFilterDefaults = {
  read: 'all',
  type: [],
  trip: undefined,
  from: undefined,
  to: undefined,
} satisfies Partial<NotificationsSearch>

export const hasNotificationFilters = (search: NotificationsSearch) =>
  search.read !== 'all' ||
  search.type.length > 0 ||
  [search.trip, search.from, search.to].some(Boolean)

/** Starts fetching the page the URL asks for before the view renders, when we hold a token. */
export function loadNotifications({ context, deps }: { context: RouterContext; deps: ApiSearch }) {
  if (!canCallProtectedApi()) return
  return context.queryClient.prefetchQuery(notificationsQueryOptions(deps))
}
