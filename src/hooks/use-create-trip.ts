import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { tripsListKey } from '@/api/queries/trips'

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return $api.useMutation('post', '/api/v1/trips', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsListKey }),
  })
}
