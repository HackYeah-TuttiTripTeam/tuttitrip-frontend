import { $api, type Schemas } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { PendingSchemas } from '@/api/pending-paths'

export type CandidatesStatus = PendingSchemas['CandidatesStatus']
export type CatalogMissing = PendingSchemas['PlanCatalogMissing']

/** The four cities with data from the team's sheet: no fetch, no OpenStreetMap attribution. */
export const SHOWCASE_CITY_SLUGS: readonly string[] = ['warszawa', 'gdansk', 'krakow', 'berlin']

/** How often the fetch of a city is asked about while it runs. */
export const CANDIDATES_POLL_MS = 2000

/** The fetch of a city's places: the state of `jobId` (the job the 409 named), or of the city's latest. */
export const candidatesStatusQueryOptions = (tripId: string, jobId: string | null) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/places/candidates/status', {
    params: { path: { trip_id: tripId }, query: jobId ? { job_id: jobId } : {} },
  })

/**
 * The 409 that plan generation answers for a city with an empty catalogue
 * (`code = "catalog_missing"`, the `job_id` that fetches it, null when no worker took it); null
 * for any other error. FastAPI nests the body in `detail`, the API may also send it flat.
 */
export function catalogMissing(error: unknown): CatalogMissing | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const detail = error.detail
  if (typeof detail !== 'object' || detail === null) return null
  if (!('code' in detail) || detail.code !== 'catalog_missing') return null
  return {
    code: 'catalog_missing',
    message: 'message' in detail && typeof detail.message === 'string' ? detail.message : '',
    city_slug:
      'city_slug' in detail && typeof detail.city_slug === 'string' ? detail.city_slug : '',
    job_id: 'job_id' in detail && typeof detail.job_id === 'string' ? detail.job_id : null,
  }
}


export type CatalogPlace = Schemas['PlaceRead']

/** The most places one page of the catalog returns (the API caps `limit` at 500). */
export const CATALOG_LIMIT = 500

export const catalogPlacesQueryOptions = (citySlug: string) =>
  $api.queryOptions('get', '/api/v1/places', {
    params: { query: { city: citySlug, limit: CATALOG_LIMIT } },
  })
