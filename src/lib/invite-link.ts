/**
 * The invitation link is `https://<front>/join#t=<token>`. The token sits in the fragment, so it
 * never reaches a server log, a Referer header or the router's search params. It is read once,
 * kept only for the login round-trip (memory + sessionStorage) and wiped after use.
 */
const FRAGMENT_KEY = 't'
const STORAGE_KEY = 'tuttitrip.join-token'

let memoryToken: string | null = null

export function buildInviteLink(origin: string, token: string): string {
  return `${origin}/join#${new URLSearchParams({ [FRAGMENT_KEY]: token })}`
}

/** The token in a location hash such as "#t=abc", or null. */
export function parseInviteFragment(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get(FRAGMENT_KEY)
  return token?.trim() ? token : null
}

export function stashJoinToken(token: string): void {
  memoryToken = token
  try {
    sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Storage blocked: the memory copy still survives in-page navigation.
  }
}

/** The token kept for the login round-trip, if any. */
export function peekJoinToken(): string | null {
  if (memoryToken) return memoryToken
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearJoinToken(): void {
  memoryToken = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored.
  }
}

/** Link fragment first (and stash it), otherwise what an earlier visit left for the login. */
export function captureJoinToken(hash: string): string | null {
  const fromLink = parseInviteFragment(hash)
  if (fromLink) {
    stashJoinToken(fromLink)
    return fromLink
  }
  return peekJoinToken()
}
