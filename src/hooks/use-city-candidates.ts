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
  const [retried, setRetried] = useState<{ after: string | null; id: string } | null>(null)
  const retriedHere =
    missing !== null && retried !== null && retried.after === (missing.job_id ?? null)
  const jobId = missing ? (retriedHere && retried ? retried.id : (missing.job_id ?? null)) : null

  const status = useQuery({
    ...candidatesStatusQueryOptions(tripId, jobId),
    enabled: missing !== null && jobId !== null,
    refetchInterval: (current) =>
      current.state.data?.state === 'running' || current.state.data === undefined
        ? CANDIDATES_POLL_MS
        : false,
  })
  const start = $api.useMutation('post', '/api/v1/trips/{trip_id}/places/candidates', {
    onSuccess: (answer) => {
      // 202 carries the new job; 200 says the city has places by now (the status shows it).
      if (missing && 'workflow_id' in answer) {
        setRetried({ after: missing.job_id ?? null, id: answer.workflow_id })
      }
      void status.refetch()
    },
  })
  const job = useJob(jobId)

  const data = status.data
  const placesCount = data?.place_count ?? 0
  const phase: CityFetchPhase =
    start.isError || job.isFailed || data?.state === 'failed' || data?.state === 'empty'
      ? 'failed'
      : data?.state === 'ready' && placesCount > 0
        ? 'ready'
        : missing && jobId === null && !start.isPending
          ? 'failed'
          : 'fetching'

  const code = data?.error_code ?? job.errorCode
  const failure: CityFetchFailure | null =
    phase !== 'failed'
      ? null
      : code === CODE_CITY_NOT_FOUND
        ? 'city_not_found'
        : data?.state === 'empty'
          ? 'no_places'
          : code === CODE_RATE_LIMITED || start.isError || job.isFailed
            ? 'external'
            : 'unknown'

  const announced = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'ready' || !jobId || announced.current === jobId) return
    announced.current = jobId
    onReady()
  }, [phase, jobId, onReady])

  return {
    phase,
    failure,
    percent: job.progress?.percent ?? null,
    placesCount,
    isRetrying: start.isPending,
    retry: () => start.mutate({ params: { path: { trip_id: tripId } }, body: null }),
  }
}
