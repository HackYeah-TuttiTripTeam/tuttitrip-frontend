import { create } from 'zustand'
import { readSharingTrips, writeSharingTrips } from '@/lib/location-session'

/** What the last attempt to read the device position ended with. */
export type GeoStatus = 'idle' | 'ok' | 'denied' | 'unavailable'

interface LocationState {
  status: GeoStatus
  setStatus: (status: GeoStatus) => void
  /** Trips whose sharing this tab started or resumed by a tap: only these send positions. */
  activeTrips: string[]
  setActive: (tripId: string, active: boolean) => void
}

/** Shared by the sender (runs while a trip is open) and the Lokalizacje tab that explains it. */
export const useLocationStore = create<LocationState>()((set, get) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
  activeTrips: readSharingTrips(),
  setActive: (tripId, active) => {
    const rest = get().activeTrips.filter((id) => id !== tripId)
    const next = active ? [...rest, tripId] : rest
    writeSharingTrips(next)
    set({ activeTrips: next })
  },
}))
