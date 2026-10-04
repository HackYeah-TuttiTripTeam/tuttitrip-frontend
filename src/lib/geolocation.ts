import type { GeoStatus } from '@/stores/location-store'
import { GEOLOCATION_MAX_AGE_MS, GEOLOCATION_TIMEOUT_MS } from './trip-extras'

export interface DevicePosition {
  latitude: number
  longitude: number
  /** Radius in metres, when the device says. */
  accuracy_m: number | null
}

/** The device refused (permission) or cannot tell where it is. */
export class GeolocationFailure extends Error {
  readonly status: Exclude<GeoStatus, 'idle' | 'ok'>
  constructor(status: Exclude<GeoStatus, 'idle' | 'ok'>) {
    super(`Geolocation ${status}`)
    this.name = 'GeolocationFailure'
    this.status = status
  }
}

export const canLocate = () => typeof navigator !== 'undefined' && 'geolocation' in navigator

/** One reading of the device position; the first call makes the browser ask for permission. */
export function readPosition(): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (!canLocate()) {
      reject(new GeolocationFailure('unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy_m: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
        }),
      (error) =>
        reject(
          new GeolocationFailure(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
        ),
      { maximumAge: GEOLOCATION_MAX_AGE_MS, timeout: GEOLOCATION_TIMEOUT_MS },
    )
  })
}
