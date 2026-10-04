import type { CitySuggestion } from '@/api/queries/cities'

/** What the city field needs from a search: the typed text, the answer and its state. */
export interface CitySearch {
  query: string
  onQueryChange: (query: string) => void
  /** The text is long enough to search for. */
  searchable: boolean
  /** Typing has not settled or the request is on its way. */
  isSearching: boolean
  isError: boolean
  retry: () => void
  suggestions: CitySuggestion[]
  /** False when the API answered without the OpenStreetMap part. */
  geocoderAvailable: boolean
}

/** "lisboa-portugal" -> "Lisboa Portugal": the best name a stored slug gives without a lookup. */
export function nameFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** "PL" -> "Polska" / "Poland", by the UI language; the code itself when the browser can't say. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/** The text shown for the stored place: the destination, else a name made of the city slug. */
export function placeLabel(destination: string, citySlug: string): string {
  return destination.trim() || nameFromSlug(citySlug)
}
