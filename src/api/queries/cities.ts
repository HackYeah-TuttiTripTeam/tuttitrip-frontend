import { $api, type Schemas } from '@/api/client'

export type City = Schemas['CityRead']

/** Cities the planner covers, with time zone and currency. Rarely changes. */
export const citiesQueryOptions = () => ({
  ...$api.queryOptions('get', '/api/v1/places/cities'),
  staleTime: 60 * 60 * 1000,
})

export type CitySuggestion = Schemas['CitySuggestion']
export type CitySuggestionPage = Schemas['CitySuggestionPage']

/**
 * Live suggestions for what is typed: catalog cities first, then OpenStreetMap ones. `lang` is the
 * UI language (the geocoder names follow it).
 */
export const citySearchQueryOptions = (q: string, lang: 'pl' | 'en', size: number) => ({
  ...$api.queryOptions('get', '/api/v1/places/cities/search', {
    params: { query: { q, lang, size } },
  }),
  staleTime: 5 * 60 * 1000,
})
