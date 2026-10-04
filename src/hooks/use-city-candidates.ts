import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { $api } from '@/api/client'
import {
  CANDIDATES_POLL_MS,
  type CatalogMissing,
  candidatesStatusQueryOptions,
} from '@/api/queries/places'
import { useJob } from './use-job'

export type CityFetchPhase = 'fetching' | 'ready' | 'failed'
/** Why a fetch failed: the external service (Overpass is often busy), an unknown city, or no places. */
export type CityFetchFailure = 'external' | 'city_not_found' | 'no_places' | 'unknown'

const CODE_CITY_NOT_FOUND = 'city_not_found'
const CODE_RATE_LIMITED = 'rate_limited'

/**
 * Fetching the places of a city that is not in the catalogue: the job the 409 `catalog_missing`
 * named (or one started by "try again"), its progress, the number of places found and the failure.
 * `onReady` runs once per job when places arrived, so the plan can be computed without a reload.
 * Inactive while `missing` is null.
 */
export function useCityCandidates(
  tripId: string,
  missing: CatalogMissing | null,
  onReady: () => void,
) {
  // A retry starts a new job; it counts only for the 409 it answers, not for a later one.
  const [retried, setRetried] = useState<{ after: string; id: string } | null>(null)
  const workflowId = missing
    ? retried?.after === missing.workflow_id
      ? retried.id
      : missing.workflow_id
    : null
  const status = useQuery({
    ...candidatesStatusQueryOptions(tripId),
    enabled: missing !== null,
    refetchInterval: (current) =>
      current.state.data?.status === 'ready' || current.state.data?.status === 'failed'
        ? false
        : CANDIDATES_POLL_MS,
  })
  const start = $api.useMutation('post', '/api/v1/trips/{trip_id}/places/candidates', {
    onSuccess: (job) => {
      if (missing) setRetried({ after: missing.workflow_id, id: job.workflow_id })
      // The status of the failed job is still cached: ask again, which also restarts the polling.
      void status.refetch()
    },
  })

  const job = useJob(workflowId)

  const data = status.data
  const jobFailed = job.isFailed || (start.isError && !start.isPending)
  const placesCount = data?.places_count ?? 0
  const phase: CityFetchPhase =
    jobFailed || data?.status === 'failed'
      ? 'failed'
      : data?.status === 'ready' && placesCount > 0
        ? 'ready'
        : data?.status === 'ready'
          ? 'failed'
          : 'fetching'

  const code = data?.error_code ?? job.errorCode
  const failure: CityFetchFailure | null =
    phase !== 'failed'
      ? null
      : code === CODE_CITY_NOT_FOUND
        ? 'city_not_found'
        : data?.status === 'ready'
          ? 'no_places'
          : code === CODE_RATE_LIMITED || start.isError || job.isFailed
            ? 'external'
            : 'unknown'

  const announced = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'ready' || !workflowId || announced.current === workflowId) return
    announced.current = workflowId
    onReady()
  }, [phase, workflowId, onReady])

  return {
    phase,
    failure,
    percent: job.progress?.percent ?? null,
    placesCount,
    cityName: data?.city_name ?? missing?.city_name ?? null,
    isRetrying: start.isPending,
    retry: () => {
      start.mutate({ params: { path: { trip_id: tripId } }, body: {} })
    },
  }
}
