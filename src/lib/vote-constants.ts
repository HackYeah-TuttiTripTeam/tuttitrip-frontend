import type { Schemas } from '@/api/client'

type VoteSource = Schemas['VoteSource']
type VoteSummarySort = Schemas['VoteSummarySort']

/**
 * Base interval, in ms, of asking again for the host's result and the plan while a voting link is
 * working and nothing is open on top of the page. A failed poll doubles it, up to the maximum below.
 */
export const VOTE_POLL_MS = 7000

/** The longest wait between two polls after failures, in ms. */
export const VOTE_POLL_MAX_MS = 60_000

/** Places per page of the vote summary. */
export const VOTE_SUMMARY_PAGE_SIZE = 10

/** Most voting links one request may list (the API's page maximum; one per person and a few old ones). */
export const VOTE_LINKS_PAGE_SIZE = 100

/** Days a new voting link works; the API's own default, sent explicitly because the type needs it. */
export const VOTE_LINK_VALID_DAYS = 14

/** Days a named invitation works; the API's own default. */
export const NAMED_INVITATION_VALID_DAYS = 7

/** A named invitation is for one person, so it can be used once. */
export const NAMED_INVITATION_MAX_USES = 1

/** Where a vote can come from, as the filter offers it. */
export const VOTE_SOURCES = ['app', 'link', 'host'] as const satisfies readonly VoteSource[]
export const VOTE_SUMMARY_SORTS = [
  'name',
  'want',
  'dont_want',
  'veto',
] as const satisfies readonly VoteSummarySort[]
