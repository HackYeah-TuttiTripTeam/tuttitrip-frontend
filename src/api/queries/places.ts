import { $api, type Schemas } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { PendingSchemas } from '@/api/pending-paths'

export type CandidatesStatus = PendingSchemas['CandidatesStatus']
export type CatalogMissing = PendingSchemas['CatalogMissing']

/** The four cities with data from the team's sheet: no fetch, no OpenStreetMap attribution. */
export const SHOWCASE_CITY_SLUGS: readonly string[] = ['warszawa', 'gdansk', 'krakow', 'berlin']

/** How often the fetch of a city is asked about while it runs. */
export const CANDIDATES_POLL_MS = 2000

export const candidatesStatusQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/places/candidates/status', {
    params: { path: { trip_id: tripId } },
  })

/**
 * The 409 that plan generation answers for a city with an empty catalogue
 * (`detail.code = "catalog_missing"` and the job that already fetches it); null for any other error.
 */
export function catalogMissing(error: unknown): CatalogMissing | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const detail = error.detail
  if (typeof detail !== 'object' || detail === null) return null
  if (!('code' in detail) || detail.code !== 'catalog_missing') return null
  if (!('workflow_id' in detail) || typeof detail.workflow_id !== 'string') return null
  return {
    code: 'catalog_missing',
    workflow_id: detail.workflow_id,
    city_slug:
      'city_slug' in detail && typeof detail.city_slug === 'string' ? detail.city_slug : '',
    city_name:
      'city_name' in detail && typeof detail.city_name === 'string' ? detail.city_name : null,
  }
}


export type CatalogPlace = Schemas['PlaceRead']

/** The most places one page of the catalog returns (the API caps `limit` at 500). */
export const CATALOG_LIMIT = 500

export const catalogPlacesQueryOptions = (citySlug: string) =>
  $api.queryOptions('get', '/api/v1/places', {
    params: { query: { city: citySlug, limit: CATALOG_LIMIT } },
  })
