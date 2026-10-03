import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { profilesQueryOptions } from '@/api/queries/profiles'

export function useUpdateProfile(tripId: string) {
  const queryClient = useQueryClient()
  return $api.useMutation('patch', '/api/v1/trips/{trip_id}/profiles/{profile_id}', {
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profilesQueryOptions(tripId).queryKey }),
  })
}
