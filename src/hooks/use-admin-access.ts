import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '@/api/queries/me'
import { type AdminLevel, adminUsersAccess } from '@/lib/admin-access'
import type { SessionStatus } from './use-session'

/** `GET /me` read for the admin screens: the level on `admin.users` and whether the answer is in. */
export function useAdminAccess(sessionStatus: SessionStatus): {
  access: AdminLevel
  isPending: boolean
} {
  const query = useQuery({
    ...meQueryOptions(),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
    staleTime: 60_000,
  })
  return {
    access: adminUsersAccess(query.data),
    isPending: sessionStatus === 'loading' || (query.isPending && query.fetchStatus !== 'idle'),
  }
}
