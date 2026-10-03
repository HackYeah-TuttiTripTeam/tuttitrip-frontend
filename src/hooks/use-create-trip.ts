import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { tripsQueryOptions } from '@/api/queries/trips'

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return $api.useMutation('post', '/trips', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsQueryOptions().queryKey }),
  })
}
