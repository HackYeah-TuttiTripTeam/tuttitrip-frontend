import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { classifyApiError } from '@/api/errors'
import { type Trip, tripsQueryOptions } from '@/api/queries/trips'
import type { TripsSearch } from '@/loaders/trips'
import type { SessionStatus } from './use-session'

const collator = new Intl.Collator('pl-PL', { sensitivity: 'base' })

function compareTrips(a: Trip, b: Trip, sort: TripsSearch['sort']): number {
  if (sort === 'created_at') return a.created_at.localeCompare(b.created_at)
  // Trips without a destination go last in ascending order.
  return collator.compare(a[sort] ?? '￿', b[sort] ?? '￿')
}

/**
 * Trips filtered and sorted by the URL search params.
 * The API returns the full list; filtering happens here until the backend
 * grows query params (then pass them through and add loaderDeps).
 */
export function useTrips(search: TripsSearch, sessionStatus: SessionStatus) {
  const query = useQuery({
    ...tripsQueryOptions(),
    // With auth disabled we still try, so a backend without auth works locally.
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
  })

  const trips = useMemo(() => {
    const needle = search.q.trim().toLocaleLowerCase('pl-PL')
    const filtered = (query.data ?? []).filter(
      (trip) =>
        !needle ||
        trip.name.toLocaleLowerCase('pl-PL').includes(needle) ||
        (trip.destination ?? '').toLocaleLowerCase('pl-PL').includes(needle),
    )
    const direction = search.dir === 'asc' ? 1 : -1
    return filtered.sort((a, b) => direction * compareTrips(a, b, search.sort))
  }, [query.data, search.q, search.sort, search.dir])

  return {
    trips,
    total: query.data?.length ?? 0,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
