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

let inflight: Promise<string | undefined> | null = null

/**
 * Exchanges the captured invitation token for a session and finds the demo trip. React's
 * StrictMode runs effects twice; the second call shares the first one's request.
 * A failed exchange leaves any existing session as it was.
 */
export function enterDemo(): Promise<string | undefined> {
  inflight ??= run().finally(() => {
    inflight = null
  })
  return inflight
}
