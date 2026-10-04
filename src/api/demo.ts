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

async function findDemoTripId(): Promise<string | undefined> {
  try {
    const { data } = await fetchClient.GET('/api/v1/trips')
    return data ? pickDemoTrip(data)?.id : undefined
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
