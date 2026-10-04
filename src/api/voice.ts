import { VOICE_PATH } from '@/lib/interview-constants'

/**
 * Hang-up for a page that is closing. A normal request would be cancelled with the page, so this
 * one is `keepalive`; it carries the token the call started with (`sendBeacon` cannot send an
 * Authorization header).
 */
export function hangupOnPageClose(tripId: string, callId: string, token: string | undefined): void {
  void fetch(`/api/v1/trips/${tripId}/${VOICE_PATH}/${callId}/hangup`, {
    method: 'POST',
    keepalive: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}
