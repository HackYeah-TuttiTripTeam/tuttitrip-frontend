import { useMutation, useQueryClient } from '@tanstack/react-query'
import { $api, type Schemas } from '@/api/client'
import { profilesQueryOptions } from '@/api/queries/profiles'
import type { WeightPresetId } from '@/lib/fairness'
import { useCreatePlan } from './use-create-plan'

export type WeightsChange =
  | { preset: WeightPresetId; focusProfileId?: string }
  | { profileId: string; weight: number }

/**
 * Saves the weights (a preset or one person's weight), puts the new weights in the people list,
 * then recalculates the plan. The old plan stays on screen meanwhile (`isPending`). The caller
 * sends one change per release of a slider thumb.
 */
export function useUpdateWeights(tripId: string) {
  const queryClient = useQueryClient()
  const plan = useCreatePlan(tripId)
  const save = $api.useMutation('put', '/api/v1/trips/{trip_id}/profiles/weights')
  const mutation = useMutation({
    mutationFn: async (change: WeightsChange) => {
      const body: Schemas['WeightsUpdate'] =
        'preset' in change
          ? { preset: change.preset, focus_profile_id: change.focusProfileId }
          : { weights: [{ profile_id: change.profileId, weight: change.weight }] }
      const profiles = await save.mutateAsync({ params: { path: { trip_id: tripId } }, body })
      queryClient.setQueryData(profilesQueryOptions(tripId).queryKey, profiles)
      return plan.createAsync()
    },
  })

  return {
    change: (change: WeightsChange) => mutation.mutate(change),
    retry: () => mutation.variables !== undefined && mutation.mutate(mutation.variables),
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
