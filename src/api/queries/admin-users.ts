import { $api, type Schemas } from '@/api/client'
import { pagedQueryOptions } from './paged'

export type AdminUser = Schemas['AdminUserRead']
export type UserSort = Schemas['UserSort']

/** Prefix of every cached page of the list, for invalidation after a block or a delete. */
export const adminUsersKey = ['get', '/api/v1/admin/users'] as const

/** What the list view sends: the validated URL search (see loaders/admin-users.ts). */
export interface AdminUsersSearch {
  page: number
  size: number
  sort: UserSort
  dir: Schemas['SortDir']
  q: string
  blocked?: boolean | undefined
}

export const adminUsersQueryOptions = ({ q, ...rest }: AdminUsersSearch) =>
  pagedQueryOptions(
    $api.queryOptions('get', '/api/v1/admin/users', {
      params: { query: { ...rest, q: q.trim() || undefined } },
    }),
  )
