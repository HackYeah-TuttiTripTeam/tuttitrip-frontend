import { parseInviteFragment } from './invite-link'

/**
 * The voting link is `https://<front>/glos#t=<token>`. Like the invitation token it lives in the
 * fragment (never sent to a server, no Referer, no router search param), but it is simpler: the
 * page is public, so there is no login round-trip and nothing is stashed. The token exists in
 * memory only; reloading the page after the fragment was removed asks for the link again.
 */
let handoff: string | null = null

/** The link a host shows or sends: the API's relative `url` (`/glos#t=...`) on this origin. */
export function buildVoteLink(origin: string, relativeUrl: string): string {
  return new URL(relativeUrl, origin).toString()
}

/**
 * Reads the token from the address bar and removes the fragment synchronously, so no request,
 * history entry or screenshot can carry it. The history state object stays as it is.
 */
export function takeVoteToken(): string | null {
  const token = parseInviteFragment(window.location.hash)
  if (!token) return null
  handoff = token
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
  return token
}

/** The token of this visit, or null when the link was opened without one. */
export function currentVoteToken(): string | null {
  return handoff
}

export function clearVoteToken(): void {
  handoff = null
}
