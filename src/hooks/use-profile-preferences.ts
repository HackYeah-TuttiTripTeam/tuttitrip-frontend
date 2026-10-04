import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { preferencesQueryOptions } from '@/api/queries/preferences'
import type { SessionStatus } from './use-session'

/** Constraints, diet and interests of one person (the age defaults until someone saved them). */
export function useProfilePreferences(tripId: string, profileId: string, status: SessionStatus) {
  const enabled = status === 'authenticated' || status === 'disabled'
  const query = useQuery({ ...preferencesQueryOptions(tripId, profileId), enabled })
  return {
    preferences: query.data,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
