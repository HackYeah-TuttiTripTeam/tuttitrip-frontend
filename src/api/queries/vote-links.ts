import { $api, type Schemas } from '@/api/client'
import { VOTE_LINKS_PAGE_SIZE } from '@/lib/vote-constants'

export type VoteLink = Schemas['VoteLinkRead']
export type VoteLinkCreated = Schemas['VoteLinkCreated']
export type VoteSummaryPage = Schemas['Page_PlaceVoteSummary_']
export type PlaceVoteSummary = Schemas['PlaceVoteSummary']
export type PersonVote = Schemas['PersonVote']
export type VoteSource = Schemas['VoteSource']
export type VoteSummarySort = Schemas['VoteSummarySort']

/** The links of a trip, newest first; the answer never holds a token. */
export const voteLinksQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/vote-links', {
    params: { path: { trip_id: tripId }, query: { size: VOTE_LINKS_PAGE_SIZE, dir: 'desc' } },
  })

/** Everything about the voting links of one trip; the prefix invalidation after a write uses it. */
export const voteLinksKey = (tripId: string) =>
  ['get', '/api/v1/trips/{trip_id}/vote-links', { params: { path: { trip_id: tripId } } }] as const

export interface VoteSummaryParams {
  page: number
  size: number
  sort: VoteSummarySort
  source: VoteSource | undefined
  hasVeto: boolean | undefined
}

/** The group's answers place by place; the host's panel reads it every couple of seconds. */
export const voteSummaryQueryOptions = (tripId: string, params: VoteSummaryParams) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/vote-summary', {
    params: {
      path: { trip_id: tripId },
      query: {
        page: params.page,
        size: params.size,
        sort: params.sort,
        // The names are the API's: a descending count first for the three numeric sorts.
        dir: params.sort === 'name' ? 'asc' : 'desc',
        source: params.source,
        has_veto: params.hasVeto,
      },
    },
  })
