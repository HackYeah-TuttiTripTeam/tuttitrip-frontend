import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { meQueryOptions } from '@/api/queries/permissions'
import { type Level, panelAccess } from '@/lib/permissions'
import type { SessionStatus } from './use-session'

/** `GET /me`: the roles and effective access the API gives the caller. */
export function useMe(sessionStatus: SessionStatus) {
  const query = useQuery({
    ...meQueryOptions(),
    // With auth disabled we still try, so a backend without auth works locally.
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
    staleTime: 60_000,
  })
  const access: Level = panelAccess(query.data)
  return {
    me: query.data,
    /** Whether the permission panel may be shown at all (and in which mode). */
    access,
    problem: query.isError ? classifyApiError(query.error) : null,
    isPending: sessionStatus === 'loading' || (query.isPending && query.fetchStatus !== 'idle'),
  }
}
