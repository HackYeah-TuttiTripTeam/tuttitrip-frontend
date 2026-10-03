/**
 * The invitation link is `https://<front>/join#t=<token>`. The token sits in the fragment, so it
 * never reaches a server log, a Referer header or the router's search params.
 *
 * Its life in the browser:
 * 1. `takeFragmentToken` (route beforeLoad, before any render or request) reads the fragment once
 *    and strips it from the address bar; the token now lives in `handoff`, in memory.
 * 2. Signed out, the login button calls `stashJoinToken` right before the Auth0 redirect, which
 *    reloads the page. The stash is `{ token, ts }` in sessionStorage and dies after 10 minutes.
 * 3. After the redirect, `/join` (no fragment) picks the token up again with `currentJoinToken`.
 * 4. Every end of the flow (signed in, joined, dead link, error, cancelled login) calls
 *    `clearJoinToken`.
 */
const FRAGMENT_KEY = 't'
const STORAGE_KEY = 'tuttitrip.join-token'
/** A login round-trip takes seconds; anything older is a forgotten stash. */
export const STASH_TTL_MS = 10 * 60 * 1000

/** The token between reading the fragment and the end of the flow. Memory only. */
let handoff: string | null = null

export function buildInviteLink(origin: string, token: string): string {
  return `${origin}/join#${new URLSearchParams({ [FRAGMENT_KEY]: token })}`
}

/** The token in a location hash such as "#t=abc", or null. */
export function parseInviteFragment(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get(FRAGMENT_KEY)
  return token?.trim() ? token : null
}

/**
 * Reads the token from the address bar and removes the fragment synchronously, so no request,
 * history entry or screenshot can carry it. A fresh link replaces any older stash. The history
 * state object is kept as it is: the router stores its own bookkeeping there, never the token.
 */
export function takeFragmentToken(): string | null {
  const token = parseInviteFragment(window.location.hash)
  if (!token) return null
  handoff = token
  removeStash()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
  return token
}

/** Keeps the token across the Auth0 redirect, which reloads the page. */
export function stashJoinToken(token: string, now: number = Date.now()): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, ts: now }))
  } catch {
    // Storage blocked: the login then cannot come back to the invitation.
  }
}

function readStash(now: number): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'token' in parsed &&
      'ts' in parsed &&
      typeof parsed.token === 'string' &&
      typeof parsed.ts === 'number' &&
      now - parsed.ts < STASH_TTL_MS
    ) {
      return parsed.token
    }
  } catch {
    // Unreadable stash: treated like an expired one.
  }
  removeStash()
  return null
}

function removeStash(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored.
  }
}

/** The token of this visit: the one just taken from the link, else a fresh login stash. */
export function currentJoinToken(now: number = Date.now()): string | null {
  return handoff ?? readStash(now)
}

/** The token kept for the login round-trip, if any (for tests and the login button). */
export function peekJoinToken(now: number = Date.now()): string | null {
  return readStash(now)
}

export function clearJoinToken(): void {
  handoff = null
  removeStash()
}
