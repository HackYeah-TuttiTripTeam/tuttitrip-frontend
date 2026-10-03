import { $api, type Schemas } from '@/api/client'

export type City = Schemas['CityRead']

/** Cities the planner covers, with time zone and currency. Rarely changes. */
export const citiesQueryOptions = () => ({
  ...$api.queryOptions('get', '/api/v1/places/cities'),
  staleTime: 60 * 60 * 1000,
})
