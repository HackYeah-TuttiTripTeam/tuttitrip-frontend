import { useQuery } from '@tanstack/react-query'
import { ratingsQueryOptions, vetoesQueryOptions } from '@/api/queries/vetoes'

/**
 * The ratings and active vetoes of a trip, to mark them on the plan. They only decorate the plan,
 * so a failed call leaves the lists empty instead of breaking the screen.
 */
export function usePlaceFeedback(tripId: string) {
  const ratings = useQuery(ratingsQueryOptions(tripId))
  const vetoes = useQuery(vetoesQueryOptions(tripId))
  return { ratings: ratings.data ?? [], vetoes: vetoes.data ?? [] }
}
