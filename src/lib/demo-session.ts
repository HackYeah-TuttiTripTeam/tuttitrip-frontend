// The "demo" session: the jury enters with one link, /demo#t=<token>, and exchanges that token for
// a short-lived access token (POST /api/v1/auth/demo). Framework-free, so the API client and React
// can both use it.
//
// Where the tokens live, on purpose:
// - The invitation token is read from the URL fragment and removed from the address bar by
//   history.replaceState before anything else runs (captureDemoFragment, called first in main.tsx).
//   Until it is exchanged it is a module variable only.
// - After a good exchange both the access token and the invitation token are kept in memory and
//   mirrored to sessionStorage, which lives only as long as the tab. The access token lasts about
//   an hour and a jury session must outlive that, so the API client exchanges the invitation again
//   (silently, once per expiry or 401). The reload of a phone tab keeps working for the same reason.
//   Never localStorage, a query key, the URL or a log. Logout and a failed renewal erase both.
//   A refresh token, if the API sends one, is not stored: refreshing needs the confidential client.

import { parseInviteFragment } from './invite-link'

const STORAGE_KEY = 'tuttitrip-demo-session'
/** Treat the token as expired a little early, so no request leaves with one that dies in flight. */
const SKEW_MS = 10_000
/** setTimeout cannot wait longer than a signed 32-bit number of milliseconds. */
const MAX_TIMER_MS = 2_147_483_647

export type DemoStatus = 'none' | 'active' | 'expired'

interface StoredSession {
  token: string
  expiresAt: number
  /** The invitation token, for the silent renewal. Absent when the session cannot be renewed. */
  invitation?: string
}

let session: StoredSession | null = readValid()
let expired = false
let pendingToken: string | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let expiryHandler: () => void = markDemoExpired
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function readStored(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'token' in value &&
      'expiresAt' in value &&
      typeof value.token === 'string' &&
      typeof value.expiresAt === 'number'
    ) {
      const invitation =
        'invitation' in value && typeof value.invitation === 'string' ? value.invitation : undefined
      return { token: value.token, expiresAt: value.expiresAt, invitation }
    }
  } catch {
    // Storage blocked or damaged: there is simply no stored session.
  }
  return null
}

/** A stored session is kept past its expiry only when it can be renewed. */
function readValid(): StoredSession | null {
  const stored = readStored()
  return stored && (stored.invitation || !isStale(stored)) ? stored : null
}

function writeStored(value: StoredSession | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // The session then lives in memory only; a reload ends it.
  }
}

function isStale(value: StoredSession): boolean {
  return value.expiresAt - SKEW_MS <= Date.now()
}

function schedule() {
  clearTimeout(timer)
  if (!session) return
  const wait = Math.min(Math.max(session.expiresAt - SKEW_MS - Date.now(), 0), MAX_TIMER_MS)
  timer = setTimeout(() => expiryHandler(), wait)
}

schedule()

/** Loads a session left by a reload of this tab. For tests; startup does the same. */
export function restoreDemoSession(): void {
  session = readValid()
  if (!session) writeStored(null)
  expired = false
  schedule()
  notify()
}

/** Who handles the end of the access token; the API client renews, the default gives up. */
export function setDemoExpiryHandler(handler: (() => void) | null): void {
  expiryHandler = handler ?? markDemoExpired
}

export function getDemoStatus(): DemoStatus {
  if (session) return 'active'
  return expired ? 'expired' : 'none'
}

export function subscribeDemo(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The access token, or undefined when there is no demo session or it has run out. */
export function getDemoToken(): string | undefined {
  return session && !isStale(session) ? session.token : undefined
}

/** A session that ran out but still holds the invitation to get a new access token. */
export function getDemoInvitation(): string | undefined {
  return session?.invitation
}

/** Stores a fresh access token. A new invitation replaces the old one; without one it is kept. */
export function setDemoSession(
  accessToken: string,
  expiresInSeconds: number,
  invitation?: string,
): void {
  session = {
    token: accessToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    invitation: invitation ?? session?.invitation,
  }
  expired = false
  writeStored(session)
  schedule()
  notify()
}

/** Logout: the session and the invitation are gone and nothing says it ran out. */
export function clearDemoSession(): void {
  session = null
  expired = false
  clearTimeout(timer)
  writeStored(null)
  notify()
}

/** The session ended for good (no renewal possible): the UI asks to open the link again. */
export function markDemoExpired(): void {
  if (!session) return
  session = null
  expired = true
  clearTimeout(timer)
  writeStored(null)
  notify()
}

/**
 * On /demo: moves the invitation token out of the address bar into memory. Synchronous and run
 * before the first request, so the token cannot reach the API client, a referrer, analytics or
 * the browser history entry we leave behind. Any other fragment on /demo is dropped as well.
 */
export function captureDemoFragment(): void {
  const { pathname, search, hash } = window.location
  if (pathname.replace(/\/+$/, '') !== '/demo' || !hash) return
  const token = parseInviteFragment(hash)
  window.history.replaceState(window.history.state, '', `${pathname}${search}`)
  if (token) pendingToken = token
}

/** The captured invitation token, once: it is forgotten as soon as it is taken. */
export function takePendingDemoToken(): string | null {
  const token = pendingToken
  pendingToken = null
  return token
}

/** Test helper: forget everything without touching the address bar. */
export function resetDemoSessionForTests(): void {
  pendingToken = null
  clearDemoSession()
}
