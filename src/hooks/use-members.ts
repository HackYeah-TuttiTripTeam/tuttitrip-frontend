import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { membersQueryOptions } from '@/api/queries/members'
import { sortMembers } from '@/lib/members'
import type { SessionStatus } from './use-session'

/** The members of one trip with their role and participation status, in reading order. */
export function useMembers(tripId: string, sessionStatus: SessionStatus) {
  const query = useQuery({
    ...membersQueryOptions(tripId),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
  })
  return {
    members: sortMembers(query.data ?? []),
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
