import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '@/api/queries/me'
import { type AdminLevel, adminUsersAccess } from '@/lib/admin-access'
import type { SessionStatus } from './use-session'

/**
 * `GET /me` read for the admin screens: the level on `admin.users`, the caller's own `sub`, and
 * whether the answer is in. `failed` is a failed call (offline, 5xx): then `access` says nothing,
 * so a screen must not treat it as "not allowed".
 */
export function useAdminAccess(sessionStatus: SessionStatus): {
  access: AdminLevel
  sub: string | undefined
  isPending: boolean
  failed: boolean
  refetch: () => void
} {
  const query = useQuery({
    ...meQueryOptions(),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
    staleTime: 60_000,
  })
  return {
    access: adminUsersAccess(query.data),
    sub: query.data?.sub,
    isPending: sessionStatus === 'loading' || (query.isPending && query.fetchStatus !== 'idle'),
    failed: query.isError,
    refetch: () => void query.refetch(),
  }
}
