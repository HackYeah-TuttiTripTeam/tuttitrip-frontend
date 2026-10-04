import { $api, type Schemas } from '@/api/client'

export type CatalogPlace = Schemas['PlaceRead']

/** The most places one page of the catalog returns (the API caps `limit` at 500). */
export const CATALOG_LIMIT = 500

export const catalogPlacesQueryOptions = (citySlug: string) =>
  $api.queryOptions('get', '/api/v1/places', {
    params: { query: { city: citySlug, limit: CATALOG_LIMIT } },
  })
