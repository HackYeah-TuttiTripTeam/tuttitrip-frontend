import { useCallback, useEffect, useRef, useState } from 'react'
import { currentAccessToken, fetchClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { hangupOnPageClose } from '@/api/voice'
import { VOICE_DATA_CHANNEL } from '@/lib/interview-constants'
import { applyRealtimeEvent, EMPTY_VOICE_VIEW, type VoiceView } from '@/lib/voice-events'
import { getLocale } from '@/paraglide/runtime'

/** Developer-facing: the API answered 2xx without a body. */
const EMPTY_ANSWER = 'empty-voice-answer'

export type VoiceStatus = 'idle' | 'connecting' | 'live' | 'ended'

/** Why a call did not start or ended; the view has a message and a way forward for each. */
export type VoiceProblem =
  | 'unsupported'
  | 'denied'
  | 'busy'
  | 'budget'
  | 'unavailable'
  | 'auth'
  | 'failed'

const STATUS_PROBLEMS: Record<number, VoiceProblem> = {
  401: 'auth',
  409: 'busy',
  429: 'budget',
  503: 'unavailable',
}

export function classifyVoiceError(error: unknown): VoiceProblem {
  if (error instanceof ApiError) return STATUS_PROBLEMS[error.status] ?? 'failed'
  if (error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name)) {
    return 'denied'
  }
  return 'failed'
}

export const voiceSupported = () =>
  typeof RTCPeerConnection !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

interface Call {
  id: string
  connection: RTCPeerConnection
  stream: MediaStream
  audio: HTMLAudioElement
  /** The token the call started with, for the hang-up that runs while the page closes. */
  token: string | undefined
}

export interface UseVoiceCallOptions {
  tripId: string
  /** The call needs the interview session; this starts it (or returns the open one). */
  startSession: () => Promise<string>
  /** The call ended: the panel reads what the tools saved. */
  onEnded: () => void
}

/**
 * Voice interview over WebRTC. The browser talks to the provider directly (audio never passes
 * our server); our server only answers the SDP offer and attaches its sideband for the tools.
 * Everything starts on a tap: the microphone prompt and the audio playback both need a gesture.
 * `stop` releases the microphone first and then tells the server, so a failed hang-up never
 * leaves the mic on. Captions come from the provider's data-channel events.
 */
export function useVoiceCall({ tripId, startSession, onEnded }: UseVoiceCallOptions) {
  const callRef = useRef<Call | null>(null)
  const startingRef = useRef(false)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [problem, setProblem] = useState<VoiceProblem | null>(null)
  const [view, setView] = useState<VoiceView>(EMPTY_VOICE_VIEW)

  /** Releases the microphone, the connection and the audio; returns the call that was open. */
  const release = useCallback((): Call | null => {
    const call = callRef.current
    callRef.current = null
    if (!call) return null
    for (const track of call.stream.getTracks()) track.stop()
    call.connection.onconnectionstatechange = null
    call.connection.close()
    call.audio.srcObject = null
    return call
  }, [])

  const stop = useCallback(
    async (reason: VoiceProblem | null = null) => {
      const call = release()
      setStatus((current) => (current === 'idle' ? current : 'ended'))
      setView((current) => ({ ...current, speaking: false }))
      if (reason) setProblem(reason)
      if (!call) return
      try {
        await fetchClient.POST('/api/v1/trips/{trip_id}/interview/voice/{call_id}/hangup', {
          params: { path: { trip_id: tripId, call_id: call.id } },
        })
      } catch {
        // The server also ends a call at its time limit; the microphone is already released.
      } finally {
        onEndedRef.current()
      }
    },
    [release, tripId],
  )

  const start = useCallback(async () => {
    if (callRef.current || startingRef.current) return
    setProblem(null)
    if (!voiceSupported()) {
      setProblem('unsupported')
      return
    }
    startingRef.current = true
    setStatus('connecting')
    setView(EMPTY_VOICE_VIEW)
    let stream: MediaStream | null = null
    let connection: RTCPeerConnection | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      await startSession()
      connection = new RTCPeerConnection()
      const audio = new Audio()
      audio.autoplay = true
      connection.ontrack = (event) => {
        audio.srcObject = event.streams[0] ?? null
      }
      for (const track of stream.getTracks()) connection.addTrack(track, stream)
      const channel = connection.createDataChannel(VOICE_DATA_CHANNEL)
      channel.onopen = () => setStatus((current) => (current === 'connecting' ? 'live' : current))
      channel.onmessage = (event) => {
        try {
          const parsed: unknown = JSON.parse(String(event.data))
          setView((current) => applyRealtimeEvent(current, parsed))
        } catch {
          // Not JSON: nothing to caption.
        }
      }
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      const { data } = await fetchClient.POST('/api/v1/trips/{trip_id}/interview/voice/offer', {
        params: { path: { trip_id: tripId } },
        body: { sdp: offer.sdp ?? '', locale: getLocale() },
      })
      if (!data) throw new TypeError(EMPTY_ANSWER)
      const token = await currentAccessToken().catch(() => undefined)
      callRef.current = { id: data.call_id, connection, stream, audio, token }
      connection.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(connection?.connectionState ?? '')) {
          void stop(connection?.connectionState === 'failed' ? 'failed' : null)
        }
      }
      await connection.setRemoteDescription({ type: 'answer', sdp: data.sdp })
      if (channel.readyState === 'open') setStatus('live')
    } catch (failure) {
      // The offer may have been accepted before the failure: hang up what the server holds.
      if (callRef.current) await stop(classifyVoiceError(failure))
      else {
        for (const track of stream?.getTracks() ?? []) track.stop()
        connection?.close()
        setStatus('idle')
        setProblem(classifyVoiceError(failure))
      }
    } finally {
      startingRef.current = false
    }
  }, [startSession, stop, tripId])

  // Closing the tab: a normal request would be cancelled, a keepalive one is sent anyway. It needs
  // the Authorization header, which sendBeacon cannot carry.
  useEffect(() => {
    if (status !== 'live' && status !== 'connecting') return
    const onPageHide = () => {
      const call = callRef.current
      if (!call) return
      hangupOnPageClose(tripId, call.id, call.token)
      release()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [status, tripId, release])

  // Leaving the tab ends the call.
  useEffect(() => () => void stop(), [stop])

  return {
    status,
    problem,
    captions: view.captions,
    speaking: view.speaking,
    active: status === 'connecting' || status === 'live',
    supported: voiceSupported(),
    start,
    stop: () => stop(),
  }
}
