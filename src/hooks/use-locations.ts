import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { $api } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import {
  consentQueryOptions,
  locationsQueryOptions,
  sendPosition,
  withdrawSharing,
} from '@/api/queries/locations'
import { GeolocationFailure, readPosition } from '@/lib/geolocation'
import { LOCATION_SEND_INTERVAL_MS, LOCATIONS_REFETCH_MS } from '@/lib/trip-extras'
import { useLocationStore } from '@/stores/location-store'

/** The positions members share right now. Re-read while the tab is open and visible. */
export function useLocations(tripId: string) {
  const query = useQuery({
    ...locationsQueryOptions(tripId),
    refetchInterval: LOCATIONS_REFETCH_MS,
  })
  return {
    locations: query.data?.items ?? [],
    isPending: query.isPending,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}

const isLive = (until: string | null | undefined) => until != null && Date.parse(until) > Date.now()

/**
 * The caller's consent as the server holds it. `live` turns false by itself when `until` passes:
 * a timer re-renders at that moment, so nothing keeps sending on a consent that has lapsed.
 */
function useConsent(tripId: string | undefined) {
  const query = useQuery({ ...consentQueryOptions(tripId ?? ''), enabled: tripId !== undefined })
  const until = query.data?.enabled ? query.data.until : null
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!until) return
    const remaining = Date.parse(until) - Date.now()
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setTick((tick) => tick + 1), remaining)
    return () => window.clearTimeout(timer)
  }, [until])
  return { query, until, live: isLive(until) }
}

/**
 * Sends the device position every few minutes while this tab runs the sharing of the trip (the
 * person started or resumed it here by a tap), the consent is live, the trip is not over and the
 * page is visible. It never starts sharing and never asks for the location by itself: after a
 * reload on another device the Lokalizacje tab offers "Wznów udostępnianie" instead.
 */
export function useLocationBeacon(tripId: string | undefined, ended: boolean) {
  const queryClient = useQueryClient()
  const setStatus = useLocationStore((state) => state.setStatus)
  const startedHere = useLocationStore(
    (state) => tripId !== undefined && state.activeTrips.includes(tripId),
  )
  const { live } = useConsent(startedHere ? tripId : undefined)
  const running = tripId !== undefined && startedHere && live && !ended

  useEffect(() => {
    if (!tripId || !running) return
    const send = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        await sendPosition(tripId, await readPosition())
        setStatus('ok')
        await queryClient.invalidateQueries({ queryKey: locationsQueryOptions(tripId).queryKey })
      } catch (error) {
        if (error instanceof GeolocationFailure) setStatus(error.status)
        // A refused update means the consent lapsed meanwhile: ask again what the state is.
        else await queryClient.invalidateQueries({ queryKey: consentQueryOptions(tripId).queryKey })
      }
    }
    void send()
    const timer = window.setInterval(() => void send(), LOCATION_SEND_INTERVAL_MS)
    const onVisible = () => document.visibilityState === 'visible' && void send()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tripId, running, queryClient, setStatus])
}

/** The caller's own switch: state, start (with a duration), resume and stop. */
export function useLocationSharing(tripId: string) {
  const queryClient = useQueryClient()
  const setStatus = useLocationStore((state) => state.setStatus)
  const setActive = useLocationStore((state) => state.setActive)
  const startedHere = useLocationStore((state) => state.activeTrips.includes(tripId))
  const { query: consent, until, live } = useConsent(tripId)
  const [sendError, setSendError] = useState(false)
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: consentQueryOptions(tripId).queryKey }),
      queryClient.invalidateQueries({ queryKey: locationsQueryOptions(tripId).queryKey }),
    ])
  const grant = $api.useMutation('put', '/api/v1/trips/{trip_id}/locations/me/consent')
  const withdraw = $api.useMutation('delete', '/api/v1/trips/{trip_id}/locations/me')

  /** One reading and one send; the failure is shown, and the server state is re-read either way. */
  const sendFirstPosition = async (position: Awaited<ReturnType<typeof readPosition>>) => {
    try {
      await sendPosition(tripId, position)
      setStatus('ok')
    } catch {
      setSendError(true)
    }
  }

  return {
    enabled: live,
    /** Sharing is on at the server but this tab did not start it: offer to resume it. */
    resumable: live && !startedHere,
    until: until ?? null,
    isPending: consent.isPending,
    isChanging: grant.isPending || withdraw.isPending,
    error: grant.error ?? withdraw.error,
    sendError,
    /**
     * Asks the device for the position first: when it refuses, no consent is stored. Only then
     * the consent for `minutes` is saved and the first position sent. Repeating extends it.
     */
    async start(minutes: number): Promise<boolean> {
      setSendError(false)
      try {
        const position = await readPosition()
        await grant.mutateAsync({
          params: { path: { trip_id: tripId } },
          body: { duration_minutes: minutes },
        })
        setActive(tripId, true)
        await sendFirstPosition(position)
        return true
      } catch (error) {
        if (error instanceof GeolocationFailure) setStatus(error.status)
        return false
      } finally {
        await refresh()
      }
    },
    /** Takes over a consent that is live: reads the position on this tap, grants nothing new. */
    async resume(): Promise<boolean> {
      setSendError(false)
      try {
        const position = await readPosition()
        setActive(tripId, true)
        await sendFirstPosition(position)
        return true
      } catch (error) {
        if (error instanceof GeolocationFailure) setStatus(error.status)
        return false
      } finally {
        await refresh()
      }
    },
    async stop(): Promise<void> {
      try {
        await withdraw.mutateAsync({ params: { path: { trip_id: tripId } } })
        setActive(tripId, false)
        setStatus('idle')
        setSendError(false)
      } finally {
        await refresh()
      }
    },
  }
}

/** Ends the sharing this tab runs, on every trip, before the session goes away (logout). */
export async function stopSharingBeforeLogout(): Promise<void> {
  const { activeTrips, setActive } = useLocationStore.getState()
  await Promise.all(
    activeTrips.map(async (tripId) => {
      try {
        await withdrawSharing(tripId)
      } catch (error) {
        // Best effort: the consent lapses on its own at its end time.
        console.warn(error)
      }
      setActive(tripId, false)
    }),
  )
}
