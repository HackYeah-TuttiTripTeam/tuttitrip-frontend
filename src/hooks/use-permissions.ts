import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { classifyApiError } from '@/api/errors'
import {
  type AuditEntry,
  auditQueryOptions,
  featuresQueryOptions,
  permissionUsersQueryOptions,
  type Role,
  rolesQueryOptions,
  userPermissionsQueryOptions,
} from '@/api/queries/permissions'
import { compareText, lowerCase } from '@/lib/format'
import { type ClientPage, pageOf } from '@/lib/permissions'
import type { PermissionsSearch } from '@/loaders/permissions'

interface ListOptions {
  /** Off until the panel is allowed and its tab is open. */
  enabled: boolean
}

type Listing = Pick<PermissionsSearch, 'q' | 'dir' | 'page' | 'size'>

const direction = (search: Listing) => (search.dir === 'asc' ? 1 : -1)
const matches = (needle: string, ...fields: string[]) =>
  !needle || fields.some((field) => lowerCase(field).includes(needle))

function state(query: {
  isPending: boolean
  fetchStatus: string
  isError: boolean
  error: unknown
  refetch: () => unknown
}) {
  return {
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}

export function useFeatureTree({ enabled }: ListOptions) {
  return useQuery({ ...featuresQueryOptions(), enabled, staleTime: 5 * 60_000 })
}

export function useRoleNames({ enabled }: ListOptions) {
  const query = useQuery({ ...rolesQueryOptions(), enabled })
  return { roles: query.data ?? [] }
}

/** Roles filtered, sorted by name and paged by the URL params; the API returns them all. */
export function useRoles(search: Listing, { enabled }: ListOptions) {
  const query = useQuery({ ...rolesQueryOptions(), enabled })
  const page: ClientPage<Role> = useMemo(() => {
    const needle = lowerCase(search.q.trim())
    const rows = (query.data ?? [])
      .filter((role) => matches(needle, role.name, role.description))
      .sort((a, b) => direction(search) * compareText(a.name, b.name))
    return pageOf(rows, search.page, search.size)
  }, [query.data, search])
  return { ...page, hasAny: (query.data?.length ?? 0) > 0, ...state(query) }
}

export function usePermissionUsers(search: Listing, { enabled }: ListOptions) {
  const query = useQuery({ ...permissionUsersQueryOptions(), enabled })
  const page: ClientPage<string> = useMemo(() => {
    const needle = lowerCase(search.q.trim())
    const rows = (query.data ?? [])
      .filter((sub) => matches(needle, sub))
      .sort((a, b) => direction(search) * compareText(a, b))
    return pageOf(rows, search.page, search.size)
  }, [query.data, search])
  return { ...page, hasAny: (query.data?.length ?? 0) > 0, ...state(query) }
}

export function useUserPermissions(sub: string | null) {
  const query = useQuery({
    ...userPermissionsQueryOptions(sub ?? ''),
    enabled: sub !== null,
  })
  return { user: query.data, ...state(query) }
}

/** The API filters by user; sorting by time and paging happen here (the API caps at 500). */
export function useAudit(search: Listing, { enabled }: ListOptions) {
  const query = useQuery({ ...auditQueryOptions(search.q.trim()), enabled })
  const page: ClientPage<AuditEntry> = useMemo(() => {
    // Newest first is the default, which the URL calls "asc" (see PermissionsToolbar).
    const rows = [...(query.data ?? [])].sort(
      (a, b) => -direction(search) * a.created_at.localeCompare(b.created_at),
    )
    return pageOf(rows, search.page, search.size)
  }, [query.data, search])
  return { ...page, hasAny: (query.data?.length ?? 0) > 0, ...state(query) }
}
