import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { classifyApiError } from '@/api/errors'
import { type KnowledgeRead, knowledgeQueryOptions } from '@/api/queries/interview'
import type { SessionStatus } from './use-session'

/**
 * The "What we already know" data. The REST answer is the truth (it reads trips and profiles, so
 * an edit made anywhere shows here); a STATE_SNAPSHOT from the stream only makes the panel
 * quicker, and the panel refetches when the run ends.
 */
export function useKnowledge(tripId: string, sessionStatus: SessionStatus) {
  const queryClient = useQueryClient()
  const options = knowledgeQueryOptions(tripId)
  const query = useQuery({
    ...options,
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
  })

  const applySnapshot = useCallback(
    (snapshot: KnowledgeRead) => queryClient.setQueryData(options.queryKey, snapshot),
    [queryClient, options.queryKey],
  )
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: options.queryKey }),
    [queryClient, options.queryKey],
  )

  return {
    knowledge: query.data,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    applySnapshot,
    refresh,
    refetch: () => void query.refetch(),
  }
}
