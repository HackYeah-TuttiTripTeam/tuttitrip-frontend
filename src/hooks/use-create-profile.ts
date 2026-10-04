import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { profilesQueryOptions } from '@/api/queries/profiles'

export function useCreateProfile(tripId: string) {
  const queryClient = useQueryClient()
  return $api.useMutation('post', '/api/v1/trips/{trip_id}/profiles', {
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profilesQueryOptions(tripId).queryKey }),
  })
}
