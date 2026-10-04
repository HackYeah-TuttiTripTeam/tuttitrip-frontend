import { $api, type Schemas } from '@/api/client'
import { MS_PER_HOUR } from '@/lib/constants'

export type City = Schemas['CityRead']

/** Cities the planner covers, with time zone and currency. Rarely changes. */
export const citiesQueryOptions = () => ({
  ...$api.queryOptions('get', '/api/v1/places/cities'),
  staleTime: MS_PER_HOUR,
})
