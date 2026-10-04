import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { $api } from '@/api/client'
import { type PlanCreate, planBeforeQueryKey, planQueryOptions } from '@/api/queries/plans'
import { proposalQueryOptions } from '@/api/queries/proposals'
import { classifyPlanFailure } from '@/lib/plan-error'

const POLL_MS = 2000
const GIVE_UP_MS = 3 * 60 * 1000

type Fetching = { percent: number | null } | { failed: true } | null

/**
 * Builds the plan and puts the answer straight into the "latest plan" cache. Without a body the
 * API uses the trip's own settings (its `fairness_alpha`, the stored weights).
 */
export function useCreatePlan(tripId: string) {
  const queryClient = useQueryClient()
  const [fetching, setFetching] = useState<Fetching>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/plans', {
    // Remember the plan from before, so the panel can say what the recalculation changed (or that
    // it changed nothing, also when the API answers with the same version).
    onMutate: () => {
      const before = queryClient.getQueryData(planQueryOptions(tripId).queryKey) ?? null
      queryClient.setQueryData(planBeforeQueryKey(tripId), before)
    },
    onError: (error, variables) => {
      queryClient.setQueryData(planBeforeQueryKey(tripId), null)
      const failure = classifyPlanFailure(error)
      if (failure.kind === 'catalog_missing') {
        void awaitCatalog(failure.jobId, (variables as { body: PlanCreate | null }).body)
      }
    },
    onSuccess: async (plan) => {
      const { queryKey } = planQueryOptions(tripId)
      // A fetch of the old plan still in flight must not overwrite the new one.
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, plan)
      // A new version makes the open proposal outdated: read its status again.
      await queryClient.invalidateQueries({ queryKey: proposalQueryOptions(tripId).queryKey })
    },
  })
  const request = (body: PlanCreate | null) => ({ params: { path: { trip_id: tripId } }, body })

  // The city has no places yet: the API started a candidate fetch. Wait for the job, then retry.
  const awaitCatalog = async (jobId: string | null, body: PlanCreate | null) => {
    const started = Date.now()
    setFetching({ percent: null })
    while (alive.current && Date.now() - started < GIVE_UP_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
      const status = await queryClient
        .fetchQuery({
          ...$api.queryOptions('get', '/api/v1/trips/{trip_id}/places/candidates/status', {
            params: { path: { trip_id: tripId }, query: { job_id: jobId } },
          }),
          staleTime: 0,
        })
        .catch(() => null)
      if (!alive.current) return
      if (status?.state === 'ready') {
        setFetching(null)
        mutation.mutate(request(body))
        return
      }
      if (status?.state === 'failed') break
      const job = jobId
        ? await queryClient
            .fetchQuery({
              ...$api.queryOptions('get', '/api/v1/jobs/{workflow_id}', {
                params: { path: { workflow_id: jobId } },
              }),
              staleTime: 0,
            })
            .catch(() => null)
        : null
      if (job?.progress) setFetching({ percent: Math.round(job.progress.percent) })
    }
    if (alive.current) setFetching({ failed: true })
  }

  return {
    create: (body: PlanCreate | null = null) => mutation.mutate(request(body)),
    createAsync: (body: PlanCreate | null = null) => mutation.mutateAsync(request(body)),
    isPending: mutation.isPending || (fetching !== null && !('failed' in fetching)),
    fetching,
    // The contract lists no error body for this call; the client throws an ApiError anyway.
    error: mutation.error as Error | null,
    reset: () => {
      setFetching(null)
      mutation.reset()
    },
  }
}
