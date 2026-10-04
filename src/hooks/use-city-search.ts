import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { citySearchQueryOptions } from '@/api/queries/cities'
import type { CitySearch } from '@/lib/city-search'
import { CITY_SEARCH_DEBOUNCE_MS, CITY_SEARCH_MIN_CHARS, CITY_SEARCH_SIZE } from '@/lib/constants'
import { getLocale } from '@/lib/i18n'
import type { SessionStatus } from './use-session'

/**
 * Live city suggestions for a text box. The request goes out only after the typing pauses
 * (`CITY_SEARCH_DEBOUNCE_MS`) and only for a long enough text; the previous answer stays on screen
 * while the next one loads, so the list does not flicker.
 */
export function useCitySearch(sessionStatus: SessionStatus): CitySearch {
  const [query, setQuery] = useState('')
  const [settled, setSettled] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSettled(query.trim()), CITY_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const searchable = query.trim().length >= CITY_SEARCH_MIN_CHARS
  const enabled =
    settled.length >= CITY_SEARCH_MIN_CHARS &&
    (sessionStatus === 'authenticated' || sessionStatus === 'disabled')
  const result = useQuery({
    ...citySearchQueryOptions(settled, getLocale(), CITY_SEARCH_SIZE),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
  })

  return {
    query,
    onQueryChange: setQuery,
    searchable,
    isSearching: searchable && (settled !== query.trim() || result.isFetching),
    isError: searchable && result.isError,
    retry: () => void result.refetch(),
    suggestions: searchable ? (result.data?.items ?? []) : [],
    geocoderAvailable: result.data?.geocoder_available ?? true,
  }
}
