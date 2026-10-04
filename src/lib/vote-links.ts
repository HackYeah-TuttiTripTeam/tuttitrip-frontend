import type { VoteLink } from '@/api/queries/vote-links'

export type VoteLinkStatus = 'none' | 'active' | 'expired' | 'revoked'

/** A person's current voting link: a working one if there is any, else the newest. */
export function currentVoteLink(links: VoteLink[], profileId: string): VoteLink | undefined {
  const own = links.filter((link) => link.profile_id === profileId)
  return own.find((link) => link.state === 'active') ?? own[0]
}

export function voteLinkStatus(link: VoteLink | undefined): VoteLinkStatus {
  return link ? link.state : 'none'
}
