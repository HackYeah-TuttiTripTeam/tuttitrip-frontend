import { useQuery } from '@tanstack/react-query'
import { ratingsQueryOptions, vetoesQueryOptions } from '@/api/queries/vetoes'

/**
 * The ratings and active vetoes of a trip, to mark them on the plan. When either call fails,
 * `failed` says so (the screen must not act on an empty list: a veto already filed would look
 * missing and could be filed twice) and `refetch` tries again.
 */
export function usePlaceFeedback(tripId: string) {
  const ratings = useQuery(ratingsQueryOptions(tripId))
  const vetoes = useQuery(vetoesQueryOptions(tripId))
  return {
    ratings: ratings.data ?? [],
    vetoes: vetoes.data ?? [],
    failed: ratings.isError || vetoes.isError,
    refetch: () => {
      void ratings.refetch()
      void vetoes.refetch()
    },
  }
}
