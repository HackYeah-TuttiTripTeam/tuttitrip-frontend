import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { planQueryOptions } from '@/api/queries/plans'
import type { DraftPlan } from '@/api/queries/proposals'
import { DRAFT_ASSUMPTIONS_KEY, MISSING_CITY_DETAIL } from '@/lib/constants'

export type DraftPlanError = 'no_city' | 'forbidden' | 'offline' | 'failed'

const assumptionsKey = (tripId: string) => [DRAFT_ASSUMPTIONS_KEY, tripId] as const

/**
 * What the last "Build plan now" assumed. The API returns it once, with the answer of the build,
 * and does not store it, so it is kept in the cache for the Plan tab. Reading it never fetches.
 */
export function useDraftAssumptions(tripId: string, planId: string | undefined) {
  const { data } = useQuery<DraftPlan | null>({
    queryKey: assumptionsKey(tripId),
    queryFn: () => null,
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
  return data && data.plan_id === planId ? data.assumptions : null
}

interface Options {
  tripId: string
  /** The assistant or a voice call is still working: the build waits for it to finish. */
  busy: boolean
  onBuilt: () => void
}

/**
 * "Build plan now". While the assistant is answering (or a call is running) its tools are still
 * writing to the trip, so the request is queued and sent when that ends: the plan then has
 * everything the host has said so far. A click while idle sends at once.
 */
export function useBuildPlanNow({ tripId, busy, onBuilt }: Options) {
  const queryClient = useQueryClient()
  const [queued, setQueued] = useState(false)
  const callback = useRef(onBuilt)
  callback.current = onBuilt

  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/interview/draft-plan', {
    onSuccess: async (draft) => {
      queryClient.setQueryData(assumptionsKey(tripId), draft)
      await queryClient.invalidateQueries({ queryKey: planQueryOptions(tripId).queryKey })
      callback.current()
    },
  })
  const { mutate, reset } = mutation

  useEffect(() => {
    if (!queued || busy) return
    setQueued(false)
    mutate({ params: { path: { trip_id: tripId } } })
  }, [queued, busy, mutate, tripId])

  // The generated type of the error is `never` (the schema gives no body); the client throws ApiError.
  const failure: unknown = mutation.error
  const error: DraftPlanError | null = !failure
    ? null
    : failure instanceof TypeError
      ? 'offline'
      : failure instanceof ApiError && failure.status === 403
        ? 'forbidden'
        : failure instanceof ApiError &&
            failure.status === 422 &&
            failure.detail === MISSING_CITY_DETAIL
          ? 'no_city'
          : 'failed'

  return {
    build: () => {
      reset()
      setQueued(true)
    },
    /** Waiting for the assistant to finish, or the request is in flight. */
    isPending: queued || mutation.isPending,
    waiting: queued && busy,
    error,
  }
}
