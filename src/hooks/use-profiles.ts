import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { membersQueryOptions } from '@/api/queries/members'
import { profilesQueryOptions } from '@/api/queries/profiles'
import { joinPeople } from '@/lib/people'
import type { SessionStatus } from './use-session'

/**
 * All people of a trip: profiles joined with members (roles). A failed members call still shows
 * the list, without roles, and says so through `rolesFailed`.
 */
export function useProfiles(tripId: string, sessionStatus: SessionStatus) {
  const enabled = sessionStatus === 'authenticated' || sessionStatus === 'disabled'
  const profiles = useQuery({ ...profilesQueryOptions(tripId), enabled })
  const members = useQuery({ ...membersQueryOptions(tripId), enabled })

  return {
    people: joinPeople(profiles.data ?? [], members.data ?? []),
    isPending:
      (profiles.isPending && profiles.fetchStatus !== 'idle') ||
      (members.isPending && members.fetchStatus !== 'idle'),
    rolesFailed: members.isError,
    problem: profiles.isError ? classifyApiError(profiles.error) : null,
    refetch: () => void profiles.refetch(),
  }
}
