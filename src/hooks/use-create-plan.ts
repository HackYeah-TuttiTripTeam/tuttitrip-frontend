import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { $api } from '@/api/client'
import { type CatalogMissing, catalogMissing } from '@/api/queries/places'
import { planQueryOptions } from '@/api/queries/plans'

/**
 * Builds the plan and puts the answer straight into the "latest plan" cache. For a city with no
 * places yet the API answers 409 `catalog_missing`: that is not an error but the state "fetching
 * places for the city", kept in `missing` until a plan comes back.
 */
export function useCreatePlan(tripId: string) {
  const queryClient = useQueryClient()
  const [missing, setMissing] = useState<CatalogMissing | null>(null)
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/plans', {
    onSuccess: async (plan) => {
      setMissing(null)
      const { queryKey } = planQueryOptions(tripId)
      // A fetch of the old plan still in flight must not overwrite the new one.
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, plan)
    },
    onError: (error) => setMissing(catalogMissing(error)),
  })

  return {
    create: () => mutation.mutate({ params: { path: { trip_id: tripId } }, body: null }),
    isPending: mutation.isPending,
    // The contract lists no error body for this call; the client throws an ApiError anyway.
    error: missing ? null : (mutation.error as Error | null),
    missing,
  }
}
