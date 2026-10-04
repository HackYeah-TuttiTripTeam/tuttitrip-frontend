import { useCallback, useMemo } from 'react'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { DisplayMessage } from '@/api/queries/interview'
import type { ChatLine } from '@/lib/interview'
import { HISTORY_PAGE_SIZE } from '@/lib/interview-constants'
import type { SessionStatus } from './use-session'

const toLine = (message: DisplayMessage): ChatLine => ({
  id: `history-${message.position}`,
  role: message.role,
  text: message.text,
})

/**
 * The open session of the trip and its conversation. History comes newest page first
 * (`dir=desc`), so the chat shows the latest messages at once and "Earlier messages" loads
 * the next page; the lines are put back in reading order here. A trip without a session answers
 * 404, which is the empty state, not an error. The history is read once per visit: the messages
 * of this visit live in `useInterview`, so a refetch would show them twice.
 */
export function useInterviewSession(tripId: string, sessionStatus: SessionStatus) {
  const query = $api.useInfiniteQuery(
    'get',
    '/api/v1/trips/{trip_id}/interview/sessions/current',
    {
      params: {
        path: { trip_id: tripId },
        query: { size: HISTORY_PAGE_SIZE, dir: 'desc' },
      },
    },
    {
      enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
      pageParamName: 'page',
      initialPageParam: 1,
      getNextPageParam: (last) =>
        last.messages.page < last.messages.pages ? last.messages.page + 1 : undefined,
      staleTime: Number.POSITIVE_INFINITY,
      // Leaving the tab drops it, so coming back reads the messages of the previous visit too.
      gcTime: 0,
      refetchOnWindowFocus: false,
      retry: (count, error) => !(error instanceof ApiError) && count < 2,
    },
  )
  const start = $api.useMutation('post', '/api/v1/trips/{trip_id}/interview/sessions')

  const session = query.data?.pages[0]
  const history = useMemo(
    () =>
      (query.data?.pages ?? [])
        .flatMap((page) => page.messages.items)
        .map(toLine)
        .reverse(),
    [query.data],
  )

  const startSession = useCallback(async () => {
    const created = await start.mutateAsync({ params: { path: { trip_id: tripId } } })
    return created.id
  }, [start, tripId])

  const noSession = query.error instanceof ApiError && query.error.status === 404

  return {
    threadId: session?.id,
    history,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    /** Failed to load, other than "no session yet". */
    error: query.isError && !noSession ? query.error : null,
    hasEarlier: query.hasNextPage,
    loadingEarlier: query.isFetchingNextPage,
    loadEarlier: () => void query.fetchNextPage(),
    startSession,
    refetch: () => void query.refetch(),
  }
}
