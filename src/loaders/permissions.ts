import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import { meQueryOptions } from '@/api/queries/permissions'
import { createListSearchSchema, textFilter } from './list-search'
import type { RouterContext } from './router-context'

export const PERMISSION_TABS = ['roles', 'users', 'audit'] as const
export type PermissionTab = (typeof PERMISSION_TABS)[number]

/**
 * /admin/permissions?tab=&q=&page=&size=&dir=&open=. `open` names the editor in the modal:
 * `role:<name>`, `role:` (a new role) or `user:<sub>`; it lives in the URL so a reload keeps it.
 * Roles and users sort by name, the audit by time (newest first by default).
 */
const { schema, defaults } = createListSearchSchema({
  sortKeys: ['name'],
  defaultSort: 'name',
  defaultDir: 'asc',
  filters: {
    tab: z.enum(PERMISSION_TABS).default('roles').catch('roles'),
    q: textFilter(),
    open: z.string().max(200).default('').catch(''),
  },
})

export const permissionsSearchSchema = schema
export const permissionsSearchDefaults = defaults
export type PermissionsSearch = z.output<typeof schema>
export const permissionFilterDefaults = { q: '' } as const

/** Warms /me so the guard in the view does not flash; the view still decides from the answer. */
export function loadPermissions({ context }: { context: RouterContext }) {
  if (!canCallProtectedApi()) return
  return context.queryClient.prefetchQuery(meQueryOptions())
}
