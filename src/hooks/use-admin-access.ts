import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { meQueryOptions } from '@/api/queries/planning-parameters'
import type { SessionStatus } from './use-session'

export type AccessLevel = 'NONE' | 'READ' | 'WRITE'

/** The feature node that guards the algorithm parameters (backend `Feature.ADMIN_PLANNING_WEIGHTS`). */
const PLANNING_FEATURE = 'admin.planning_weights'

/** What the signed-in person may do with the algorithm parameters, as `GET /me` says. */
export function useAdminAccess(sessionStatus: SessionStatus) {
  const query = useQuery({
    ...meQueryOptions(),
    // With auth disabled we still try, so a backend without auth works locally.
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
    staleTime: 60_000,
  })
  const me = query.data
  const level: AccessLevel = !me
    ? 'NONE'
    : me.is_admin
      ? 'WRITE'
      : (me.access[PLANNING_FEATURE] ?? 'NONE')
  return {
    level,
    problem: query.isError ? classifyApiError(query.error) : null,
    /** `GET /me` answered, so a missing permission is a fact and not a guess. */
    ready: query.isSuccess,
    isPending: sessionStatus === 'loading' || (query.isPending && query.fetchStatus !== 'idle'),
  }
}
