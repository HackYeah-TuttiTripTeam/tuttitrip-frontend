import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import {
  type AdminUsersSearch as ApiSearch,
  adminUsersQueryOptions,
} from '@/api/queries/admin-users'
import { meQueryOptions } from '@/api/queries/me'
import { adminUsersAccess } from '@/lib/admin-access'
import { m } from '@/paraglide/messages'
import { createListSearchSchema, textFilter } from './list-search'
import type { RouterContext } from './router-context'
import { appHead } from './seo'

export const USER_SORT_KEYS = ['created_at', 'last_login', 'email'] as const
export type UserSortKey = (typeof USER_SORT_KEYS)[number]

/**
 * /admin/users?q=&blocked=&sort=&dir=&page=&size= — the URL is the single source of truth; the API
 * searches, filters, sorts and pages. `blocked` is true, false, or absent for all accounts.
 */
const { schema, defaults } = createListSearchSchema({
  sortKeys: USER_SORT_KEYS,
  defaultSort: 'created_at',
  defaultDir: 'desc',
  filters: {
    q: textFilter(),
    blocked: z.boolean().optional().catch(undefined),
  },
})

export const adminUsersSearchSchema = schema
export const adminUsersSearchDefaults = defaults
export type AdminUsersSearch = z.output<typeof adminUsersSearchSchema>

export const adminUserFilterDefaults = {
  q: '',
  blocked: undefined,
} satisfies Partial<AdminUsersSearch>

/**
 * Sends people without `admin.users` back to the trips before the page renders, and starts
 * fetching the list for the others. Hiding the route is a convenience: the API answers 403 anyway.
 * Without a token yet (the session is still loading) the view decides once `GET /me` answers.
 */
export async function loadAdminUsers({
  context,
  deps,
}: {
  context: RouterContext
  deps: ApiSearch
}) {
  if (!canCallProtectedApi()) return
  const me = await context.queryClient
    .fetchQuery({ ...meQueryOptions(), staleTime: 60_000 })
    .catch(() => undefined)
  if (me && adminUsersAccess(me) === 'NONE') throw redirect({ to: '/trips', replace: true })
  if (me) await context.queryClient.prefetchQuery(adminUsersQueryOptions(deps))
}

export const adminUsersHead = appHead(m.admin_users_title)
