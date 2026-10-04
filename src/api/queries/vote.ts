import { queryOptions } from '@tanstack/react-query'
import { createPublicClient } from '@/api/client'
import type { RatingWrite, VotePaths, VotePlace, VoteSession } from '@/api/vote-contract'

export type { RatingValue, ReasonCode, VotePlace, VoteSession } from '@/api/vote-contract'

const voteClient = createPublicClient<VotePaths>()

/** The header the backend's `token_access` reads. */
const TOKEN_HEADER = 'X-Access-Token'
const headerFor = (token: string) => ({ [TOKEN_HEADER]: token }) as { 'X-Access-Token': string }

export const voteSessionKey = ['vote', 'session'] as const

/**
 * The places of the plan with this person's own answers. The token is used by the query function
 * only: it is not part of the key (the key is cached and shown in devtools). A dead link answers
 * 401 or 404 for good, so nothing is retried or refetched in the background.
 */
export const voteSessionQueryOptions = (token: string) =>
  queryOptions({
    queryKey: voteSessionKey,
    queryFn: async (): Promise<VoteSession> => {
      const { data } = await voteClient.GET('/api/v1/vote/session', {
        params: { header: headerFor(token) },
      })
      if (!data) throw new Error('Empty voting session')
      return data
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  })

export async function putRating(
  token: string,
  placeId: string,
  body: RatingWrite,
): Promise<VotePlace> {
  const { data } = await voteClient.PUT('/api/v1/vote/ratings/{place_id}', {
    params: { header: headerFor(token), path: { place_id: placeId } },
    body,
  })
  if (!data) throw new Error('Empty rating answer')
  return data
}

export async function postVeto(token: string, placeId: string): Promise<VotePlace> {
  const { data } = await voteClient.POST('/api/v1/vote/vetoes', {
    params: { header: headerFor(token) },
    body: { place_id: placeId },
  })
  if (!data) throw new Error('Empty veto answer')
  return data
}

export async function deleteVeto(token: string, vetoId: string): Promise<VotePlace> {
  const { data } = await voteClient.DELETE('/api/v1/vote/vetoes/{veto_id}', {
    params: { header: headerFor(token), path: { veto_id: vetoId } },
  })
  if (!data) throw new Error('Empty veto answer')
  return data
}
