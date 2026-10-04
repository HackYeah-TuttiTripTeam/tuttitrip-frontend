import { useMutation } from '@tanstack/react-query'
import type { Trip } from '@/api/queries/trips'
import { useCreatePlan } from './use-create-plan'
import { useUpdateTrip } from './use-update-trip'

/**
 * Saves the fairness slider in the trip, then recalculates the plan with it. One save per release
 * of the thumb. When a step fails, `error` says so and `retry` repeats the whole change (saving the
 * same value twice is harmless).
 */
export function useUpdateFairnessAlpha(trip: Trip) {
  const updateTrip = useUpdateTrip()
  const plan = useCreatePlan(trip.id)
  const mutation = useMutation({
    mutationFn: async (alpha: number) => {
      await updateTrip.mutateAsync({
        params: { path: { trip_id: trip.id } },
        body: { fairness_alpha: alpha },
      })
      return plan.createAsync()
    },
  })

  return {
    commit: (alpha: number) => mutation.mutate(alpha),
    retry: () => mutation.variables !== undefined && mutation.mutate(mutation.variables),
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
