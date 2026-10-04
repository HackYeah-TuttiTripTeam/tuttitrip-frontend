import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { classifyApiError } from '@/api/errors'
import {
  deleteVeto,
  postVeto,
  putRating,
  type RatingValue,
  type ReasonCode,
  type VotePlace,
  type VoteSession,
  voteSessionKey,
  voteSessionQueryOptions,
} from '@/api/queries/vote'
import { clearVoteToken, currentVoteToken } from '@/lib/vote-link'

/**
 * The token and the key of this visit, read once (the route already took the token off the
 * address bar). A ref keeps them across the extra mount of React StrictMode, whose cleanup would
 * otherwise have erased the token the second mount needs.
 */
export function useVoteVisit(): { token: string | null; visit: string } {
  const ref = useRef<{ token: string | null; visit: string } | null>(null)
  ref.current ??= { token: currentVoteToken(), visit: crypto.randomUUID() }
  return ref.current
}

/** What the page shows when something fails: a dead link has its own message. */
export type VoteProblem = 'dead_link' | 'offline' | 'unknown'

export function classifyVoteProblem(error: unknown): VoteProblem {
  const problem = classifyApiError(error)
  if (problem === 'unauthorized' || problem === 'not_found') return 'dead_link'
  return problem === 'offline' ? 'offline' : 'unknown'
}

/** Replaces one place in the cached session with the server's fresh answer. */
const withPlace = (session: VoteSession | undefined, place: VotePlace) =>
  session && {
    ...session,
    places: session.places.map((p) => (p.place_id === place.place_id ? place : p)),
  }

/**
 * The voting page's data: the session and the three writes. Every write answers with the place's
 * new state, which is put into the cache, so the screen follows the server without a reload.
 */
export function useVoteSession(token: string | null, visit: string) {
  const queryClient = useQueryClient()
  const session = useQuery({
    ...voteSessionQueryOptions(token ?? '', visit),
    enabled: token !== null,
  })

  // The token and the answers have done their job once the page is gone. (React StrictMode runs
  // this cleanup once on the first mount too; the ref above keeps the visit, and the query is
  // fetched again by the observer that mounts next.)
  useEffect(
    () => () => {
      clearVoteToken()
      queryClient.removeQueries({ queryKey: voteSessionKey(visit) })
    },
    [queryClient, visit],
  )

  const store = (place: VotePlace) =>
    queryClient.setQueryData<VoteSession>(voteSessionKey(visit), (current) =>
      withPlace(current, place),
    )

  const rate = useMutation({
    mutationFn: (args: { placeId: string; value: RatingValue; reason?: ReasonCode }) =>
      putRating(token ?? '', args.placeId, { value: args.value, reason_code: args.reason ?? null }),
    gcTime: 0,
    onSuccess: store,
  })
  const veto = useMutation({
    mutationFn: (placeId: string) => postVeto(token ?? '', placeId),
    gcTime: 0,
    onSuccess: store,
  })
  const withdraw = useMutation({
    mutationFn: (vetoId: string) => deleteVeto(token ?? '', vetoId),
    gcTime: 0,
    onSuccess: store,
  })

  const failed = rate.isError || veto.isError || withdraw.isError
  return {
    session: session.data,
    isPending: session.isPending && session.fetchStatus !== 'idle',
    problem: session.isError ? classifyVoteProblem(session.error) : null,
    refetch: () => void session.refetch(),
    rate: rate.mutate,
    vetoPlace: veto.mutate,
    withdrawVeto: withdraw.mutate,
    /** The place being written right now, to disable its buttons. */
    busyPlaceId: rate.isPending
      ? rate.variables.placeId
      : veto.isPending
        ? veto.variables
        : undefined,
    busy: rate.isPending || veto.isPending || withdraw.isPending,
    writeFailed: failed,
    saved: rate.isSuccess || veto.isSuccess || withdraw.isSuccess,
    /** Hides the last write error once the person tries again. */
    resetErrors: () => {
      rate.reset()
      veto.reset()
      withdraw.reset()
    },
  }
}
