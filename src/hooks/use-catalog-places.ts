import { useQuery } from '@tanstack/react-query'
import { catalogPlacesQueryOptions } from '@/api/queries/places'

/**
 * The catalog places of the trip's city, to search them by name. Without a city, or when the
 * caller may not read the catalog, the list stays empty and the screen takes typed names only.
 */
export function useCatalogPlaces(citySlug: string | null, enabled: boolean) {
  const query = useQuery({
    ...catalogPlacesQueryOptions(citySlug ?? ''),
    enabled: enabled && citySlug !== null,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return query.data ?? []
}
