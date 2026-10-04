import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { classifyApiError } from '@/api/errors'
import { planQueryOptions } from '@/api/queries/plans'
import { type VoteSummaryParams, voteSummaryQueryOptions } from '@/api/queries/vote-links'
import { VOTE_SUMMARY_POLL_MS } from '@/lib/vote-constants'

/**
 * The group's answers, asked again every couple of seconds while the panel is mounted (and the tab
 * visible), so a veto from a phone shows up without a reload. A veto recalculates the plan on the
 * server, so when the number of active vetoes changes the plan queries are dropped too.
 */
export function useVoteSummary(tripId: string, params: VoteSummaryParams) {
  const queryClient = useQueryClient()
  const query = useQuery({
    ...voteSummaryQueryOptions(tripId, params),
    refetchInterval: VOTE_SUMMARY_POLL_MS,
    // A page of old data must not flash while the next page loads.
    placeholderData: (previous) => previous,
  })

  const vetoes = query.data?.items.reduce((sum, place) => sum + place.veto_count, 0)
  // Compared per view of the list: turning the page or filtering changes the sum without a new veto.
  const isPlaceholder = query.isPlaceholderData
  const view = JSON.stringify(params)
  const last = useRef<{ view: string; vetoes: number } | undefined>(undefined)
  useEffect(() => {
    if (vetoes === undefined || isPlaceholder) return
    if (last.current?.view === view && last.current.vetoes !== vetoes) {
      void queryClient.invalidateQueries({ queryKey: planQueryOptions(tripId).queryKey })
    }
    last.current = { view, vetoes }
  }, [vetoes, isPlaceholder, view, tripId, queryClient])

  return {
    page: query.data,
    isPending: query.isPending,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
