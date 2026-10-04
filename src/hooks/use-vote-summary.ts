import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { planQueryOptions } from '@/api/queries/plans'
import { type VoteSummaryParams, voteSummaryQueryOptions } from '@/api/queries/vote-links'
import { VOTE_POLL_MAX_MS, VOTE_POLL_MS } from '@/lib/vote-constants'

/** The poll interval: the base, doubled for every failed poll in a row, never above the maximum. */
export function pollInterval(failures: number): number {
  return Math.min(VOTE_POLL_MS * 2 ** failures, VOTE_POLL_MAX_MS)
}

/**
 * The group's answers, and the plan next to them. While `polling` is true (a voting link works and
 * no dialog covers the page) both are asked again every few seconds, so a veto from a phone shows
 * up, with the plan it recalculated, without a reload. The plan is polled by itself instead of
 * being refetched when the summary changes: the summary is one page of a filtered list, so what
 * it shows says nothing about vetoes on other pages. A failing poll backs off; the tab being
 * hidden stops it (TanStack Query's default).
 */
export function useVoteSummary(tripId: string, params: VoteSummaryParams, polling: boolean) {
  const query = useQuery({
    ...voteSummaryQueryOptions(tripId, params),
    refetchInterval: polling ? (q) => pollInterval(q.state.fetchFailureCount) : false,
    retry: false,
    // A page of old data must not flash while the next page loads.
    placeholderData: (previous) => previous,
  })

  // The plan view reads this same query; polling it here keeps that view current. A trip with no
  // plan answers 404, which is an answer, not a reason to stop.
  useQuery({
    ...planQueryOptions(tripId),
    refetchInterval: polling ? (q) => pollInterval(q.state.fetchFailureCount) : false,
    retry: false,
  })

  return {
    page: query.data,
    isPending: query.isPending,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
