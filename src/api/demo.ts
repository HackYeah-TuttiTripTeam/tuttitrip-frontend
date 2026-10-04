import { getDemoStatus, takePendingDemoToken } from '@/lib/demo-session'
import { exchangeDemoInvitation, fetchClient, type Schemas } from './client'

type Trip = Schemas['TripRead']

/** The link had no token (opened without #t=..., or the fragment was already consumed). */
export class MissingDemoLinkError extends Error {}

/** The Warsaw demo trip: the family trip with the Warsaw city, else the first real trip. */
export function pickDemoTrip(trips: Trip[]): Trip | undefined {
  const own = trips.filter((candidate) => candidate.kind === 'trip')
  return (
    own.find((candidate) => candidate.city_slug === 'warszawa') ??
    own.find((candidate) => /warszaw|warsaw/i.test(candidate.destination ?? '')) ??
    own[0]
  )
}

async function run(): Promise<string | undefined> {
  const token = takePendingDemoToken()
  if (!token) {
    // A reload on /demo: the session of this tab (if any) is still good.
    if (getDemoStatus() === 'active') return findDemoTripId()
    throw new MissingDemoLinkError()
  }
  // Any ApiError (404 for a bad or disabled token) propagates to the caller. A bad link must not
  // end a session that works, so nothing is cleared here; a good one overwrites the session.
  await exchangeDemoInvitation(token)
  return findDemoTripId()
}

const DEMO_CITY = 'warszawa'

async function listOwnTrips(city?: string): Promise<Trip[]> {
  const { data } = await fetchClient.GET('/api/v1/trips', {
    params: { query: { kind: 'trip', city, size: 20 } },
  })
  return data?.items ?? []
}

async function findDemoTripId(): Promise<string | undefined> {
  try {
    // The Warsaw trip first; an account without one falls back to its first real trip.
    const trips = await listOwnTrips(DEMO_CITY)
    return pickDemoTrip(trips.length > 0 ? trips : await listOwnTrips())?.id
  } catch {
    // The list is only a convenience: the session works, the caller falls back to /trips.
    return undefined
  }
}

let entered: { promise: Promise<string | undefined>; settled: boolean } | null = null

/**
 * Exchanges the captured invitation token for a session and finds the demo trip. The page can
 * run its effect more than once (StrictMode, a remount when the session changes the shell):
 * every call while the session is being made, or after it was made, shares one request. A failed
 * exchange is forgotten, and so is a finished session that has since ended.
 */
export function enterDemo(): Promise<string | undefined> {
  if (entered?.settled && getDemoStatus() !== 'active') entered = null
  if (!entered) {
    const current = { promise: run(), settled: false }
    entered = current
    current.promise.then(
      () => {
        current.settled = true
      },
      () => {
        if (entered === current) entered = null
      },
    )
  }
  return entered.promise
}
