/** Trips on which this browser tab started location sharing; kept for the tab's life only. */
const STORAGE_KEY = 'tuttitrip-location-sharing'

export function readSharingTrips(): string[] {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** Only trip ids are stored, never coordinates. */
export function writeSharingTrips(tripIds: string[]): void {
  try {
    if (tripIds.length === 0) sessionStorage.removeItem(STORAGE_KEY)
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tripIds))
  } catch {
    // Storage blocked: sharing then has to be resumed after a reload, which is the safe side.
  }
}
