/**
 * The invitation link is `https://<front>/join#t=<token>`. The token sits in the fragment, so it
 * never reaches a server log, a Referer header or the router's search params. It is read once,
 * kept only for the login round-trip (sessionStorage) and wiped after use.
 */
const FRAGMENT_KEY = 't'
const STORAGE_KEY = 'tuttitrip.join-token'

export function buildInviteLink(origin: string, token: string): string {
  return `${origin}/join#${new URLSearchParams({ [FRAGMENT_KEY]: token })}`
}

/** The token in a location hash such as "#t=abc", or null. */
export function parseInviteFragment(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get(FRAGMENT_KEY)
  return token?.trim() ? token : null
}

/** Keeps the token across the Auth0 redirect, which reloads the page. */
export function stashJoinToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Storage blocked: the memory copy still survives in-page navigation.
  }
}

/** The token kept for the login round-trip, if any. */
export function peekJoinToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearJoinToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored.
  }
}

/** The token from the link's fragment, otherwise the one kept for the login round-trip. */
export function captureJoinToken(hash: string): string | null {
  return parseInviteFragment(hash) ?? peekJoinToken()
}
