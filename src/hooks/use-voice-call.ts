import { useCallback, useEffect, useRef, useState } from 'react'
import { currentAccessToken, fetchClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { hangupOnPageClose } from '@/api/voice'
import {
  MIC_FAILSAFE_MS,
  MIC_REOPEN_DELAY_MS,
  PTT_MIN_HOLD_MS,
  SAVED_FLASH_MS,
  VOICE_DATA_CHANNEL,
  VOICE_MODE_KEY,
} from '@/lib/interview-constants'
import {
  applyRealtimeEvent,
  EMPTY_VOICE_VIEW,
  micMayBeOpen,
  runningTool,
  type VoiceTool,
  type VoiceView,
  voiceActivity,
} from '@/lib/voice-events'
import { getLocale } from '@/paraglide/runtime'

/** Developer-facing: the API answered 2xx without a body. */
const EMPTY_ANSWER = 'empty-voice-answer'

/** `finishing`: the host ended the call and the server fills in the fields from the transcript. */
export type VoiceStatus = 'idle' | 'connecting' | 'live' | 'finishing' | 'ended'

/** Open microphone with automatic turn taking, or the mic live only while a button is held. */
export type VoiceMode = 'open' | 'ptt'

/** What holds the interview when it is not this device's call. */
export type BusyKind = 'text' | 'voice'

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

function readMode(): VoiceMode {
  try {
    return localStorage.getItem(VOICE_MODE_KEY) === 'ptt' ? 'ptt' : 'open'
  } catch {
    return 'open'
  }
}

function saveMode(mode: VoiceMode): void {
  try {
    localStorage.setItem(VOICE_MODE_KEY, mode)
  } catch {
    // Private window or blocked storage: the choice just does not survive a reload.
  }
}

/** Events the browser sends the provider over the data channel (the realtime client protocol). */
const turnDetection = (on: boolean) => ({
  type: 'session.update',
  session: {
    type: 'realtime',
    audio: { input: { turn_detection: on ? { type: 'server_vad' } : null } },
  },
})
const INTERRUPT_EVENTS = [{ type: 'response.cancel' }, { type: 'output_audio_buffer.clear' }]
const COMMIT_EVENTS = [{ type: 'input_audio_buffer.commit' }, { type: 'response.create' }]
const DISCARD_EVENTS = [{ type: 'input_audio_buffer.clear' }]

interface Call {
  id: string
  connection: RTCPeerConnection
  stream: MediaStream
  audio: HTMLAudioElement
  channel: RTCDataChannel
  /** The token the call started with, for the hang-up that runs while the page closes. */
  token: string | undefined
}

export interface UseVoiceCallOptions {
  tripId: string
  /** The call needs the interview session; this starts it (or returns the open one). */
  startSession: () => Promise<string>
  /** The call ended and the server filled in the fields: the panel reads what was saved. */
  onEnded: () => void
  /** A tool of the assistant finished (saved or refused): the panel refreshes at once. */
  onToolFinished: () => void
}

/**
 * Voice interview over WebRTC. The browser talks to the provider directly (audio never passes
 * our server); our server only answers the SDP offer and attaches its sideband for the tools.
 * Everything starts on a tap: the microphone prompt and the audio playback both need a gesture.
 *
 * The microphone track is switched, never the call: in the open mode it is muted from the end of
 * the host's speech until the assistant has finished (thinking, tools, voice), with a way to
 * speak anyway; in the hold-to-talk mode it is live only while the button is held, the server's
 * voice detection is off and the utterance is committed by hand on release. Releasing the button
 * never ends the call: `stop` does, and it frees the microphone first.
 */
export function useVoiceCall({
  tripId,
  startSession,
  onEnded,
  onToolFinished,
}: UseVoiceCallOptions) {
  const callRef = useRef<Call | null>(null)
  const startingRef = useRef(false)
  const heldSince = useRef(0)
  const finishedTools = useRef(new Set<string>())
  const callbacks = useRef({ onEnded, onToolFinished })
  callbacks.current = { onEnded, onToolFinished }
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [problem, setProblem] = useState<VoiceProblem | null>(null)
  const [view, setView] = useState<VoiceView>(EMPTY_VOICE_VIEW)
  const [mode, setModeState] = useState<VoiceMode>(readMode)
  const [held, setHeld] = useState(false)
  const [override, setOverride] = useState(false)
  const [micOpen, setMicOpen] = useState(true)
  const [saved, setSaved] = useState<VoiceTool | null>(null)
  const [elsewhere, setElsewhere] = useState<BusyKind | null>(null)

  const send = useCallback((...events: object[]) => {
    const channel = callRef.current?.channel
    if (channel?.readyState !== 'open') return
    for (const event of events) channel.send(JSON.stringify(event))
  }, [])

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
      setHeld(false)
      setOverride(false)
      setView((current) => ({ ...current, speaking: false, userSpeaking: false }))
      if (reason) setProblem(reason)
      if (!call) {
        setStatus((current) => (current === 'idle' ? current : 'ended'))
        return
      }
      // The server stores the transcript and fills in the fields before it answers.
      setStatus('finishing')
      try {
        await fetchClient.POST('/api/v1/trips/{trip_id}/interview/voice/{call_id}/hangup', {
          params: { path: { trip_id: tripId, call_id: call.id } },
        })
      } catch {
        // The server also ends a call at its time limit; the microphone is already released.
      } finally {
        setStatus('ended')
        callbacks.current.onEnded()
      }
    },
    [release, tripId],
  )

  /** What holds the interview, read from the API (a 409 does not say). */
  const refreshBusy = useCallback(async (): Promise<BusyKind | null> => {
    try {
      const { data } = await fetchClient.GET('/api/v1/trips/{trip_id}/interview/sessions/current', {
        params: { path: { trip_id: tripId }, query: { size: 1 } },
      })
      const kind = data?.running ?? null
      setElsewhere(kind)
      return kind
    } catch {
      return null
    }
  }, [tripId])

  const start = useCallback(async () => {
    if (callRef.current || startingRef.current) return
    setProblem(null)
    setElsewhere(null)
    if (!voiceSupported()) {
      setProblem('unsupported')
      return
    }
    startingRef.current = true
    // Something else holds the interview: say so before asking for the microphone.
    if (await refreshBusy()) {
      setProblem('busy')
      startingRef.current = false
      return
    }
    setStatus('connecting')
    setView(EMPTY_VOICE_VIEW)
    setSaved(null)
    finishedTools.current.clear()
    let stream: MediaStream | null = null
    let connection: RTCPeerConnection | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Hold-to-talk: the microphone stays shut until the button is pressed.
      setMicOpen(readMode() === 'open')
      for (const track of stream.getTracks()) track.enabled = readMode() === 'open'
      await startSession()
      connection = new RTCPeerConnection()
      const audio = new Audio()
      audio.autoplay = true
      connection.ontrack = (event) => {
        audio.srcObject = event.streams[0] ?? null
      }
      for (const track of stream.getTracks()) connection.addTrack(track, stream)
      const channel = connection.createDataChannel(VOICE_DATA_CHANNEL)
      channel.onopen = () => {
        setStatus((current) => (current === 'connecting' ? 'live' : current))
        // The hold-to-talk mode needs the server's voice detection off before anyone speaks.
        if (readMode() === 'ptt') channel.send(JSON.stringify(turnDetection(false)))
      }
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
      callRef.current = { id: data.call_id, connection, stream, audio, channel, token }
      connection.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(connection?.connectionState ?? '')) {
          void stop(connection?.connectionState === 'failed' ? 'failed' : null)
        }
      }
      await connection.setRemoteDescription({ type: 'answer', sdp: data.sdp })
      if (channel.readyState === 'open') setStatus('live')
    } catch (failure) {
      const reason = classifyVoiceError(failure)
      // The offer may have been accepted before the failure: hang up what the server holds.
      if (callRef.current) await stop(reason)
      else {
        for (const track of stream?.getTracks() ?? []) track.stop()
        connection?.close()
        setStatus('idle')
        setProblem(reason)
      }
      if (reason === 'busy') void refreshBusy()
    } finally {
      startingRef.current = false
    }
  }, [startSession, stop, tripId, refreshBusy])

  /** Ends a call that runs elsewhere (another device, a tab that never hung up) and frees the interview. */
  const takeOver = useCallback(async () => {
    try {
      await fetchClient.POST('/api/v1/trips/{trip_id}/interview/voice/release', {
        params: { path: { trip_id: tripId } },
      })
      setElsewhere(null)
      setProblem(null)
      callbacks.current.onEnded()
    } catch {
      setProblem('failed')
    }
  }, [tripId])

  // The microphone track follows the mode: held button, or the open mode's idle phases.
  const activity = voiceActivity(view)
  const mayOpen = mode === 'ptt' ? held : override || micMayBeOpen(view)
  useEffect(() => {
    if (status !== 'live') return
    // Closing is at once; opening waits a moment (open mode) so the assistant's tail is not heard.
    const delay = mayOpen && mode === 'open' && !override ? MIC_REOPEN_DELAY_MS : 0
    const timer = window.setTimeout(() => setMicOpen(mayOpen), delay)
    return () => window.clearTimeout(timer)
  }, [mayOpen, status, mode, override])
  // A muted mic opens by itself after a while, in case an event never came.
  useEffect(() => {
    if (status !== 'live' || mode !== 'open' || micOpen) return
    const timer = window.setTimeout(() => setOverride(true), MIC_FAILSAFE_MS)
    return () => window.clearTimeout(timer)
  }, [status, mode, micOpen])
  useEffect(() => {
    const enabled = status === 'live' && micOpen
    for (const track of callRef.current?.stream.getTracks() ?? []) track.enabled = enabled
  }, [status, micOpen])
  // "Speak anyway" lasts until the host has spoken and finished.
  const userSpeaking = view.userSpeaking
  const wasSpeaking = useRef(false)
  useEffect(() => {
    if (wasSpeaking.current && !userSpeaking) setOverride(false)
    wasSpeaking.current = userSpeaking
  }, [userSpeaking])

  // A tool that finished refreshes the panel and shows "saved" for a moment.
  useEffect(() => {
    const fresh = view.tools.filter(
      (tool) => tool.status !== 'running' && !finishedTools.current.has(tool.callId),
    )
    if (fresh.length === 0) return
    for (const tool of fresh) finishedTools.current.add(tool.callId)
    setSaved(fresh.at(-1) ?? null)
    callbacks.current.onToolFinished()
    const timer = window.setTimeout(() => setSaved(null), SAVED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [view.tools])

  const setMode = useCallback(
    (next: VoiceMode) => {
      setModeState(next)
      saveMode(next)
      setHeld(false)
      send(turnDetection(next === 'open'))
    },
    [send],
  )

  /** Hold-to-talk: the mic opens; an answer that is still playing is cut off. */
  const pressStart = useCallback(() => {
    if (status !== 'live' || mode !== 'ptt') return
    heldSince.current = performance.now()
    if (view.speaking || view.responding) send(...INTERRUPT_EVENTS)
    setHeld(true)
  }, [status, mode, view.speaking, view.responding, send])

  /** Releasing sends the utterance; a very short tap is dropped. The call goes on. */
  const pressEnd = useCallback(() => {
    if (!held) return
    setHeld(false)
    for (const track of callRef.current?.stream.getTracks() ?? []) track.enabled = false
    const long = performance.now() - heldSince.current >= PTT_MIN_HOLD_MS
    send(...(long ? COMMIT_EVENTS : DISCARD_EVENTS))
  }, [held, send])

  /** "Speak anyway": open the muted microphone and cut off the assistant. */
  const speakAnyway = useCallback(() => {
    setOverride(true)
    if (view.speaking || view.responding) send(...INTERRUPT_EVENTS)
  }, [send, view.speaking, view.responding])

  // Closing the tab: a normal request would be cancelled, a keepalive one is sent anyway.
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

  const tool = runningTool(view)
  return {
    status,
    problem,
    captions: view.captions,
    speaking: view.speaking,
    activity,
    /** Name of the tool the assistant runs now. */
    toolName: tool?.name ?? null,
    /** The tool that finished a moment ago ("saved"), or null. */
    saved,
    mode,
    held,
    /** The microphone is switched off right now (processing, or the button is not held). */
    micMuted: status === 'live' && !micOpen,
    /** A call is live and the muted mic can be overridden. */
    canOverride: status === 'live' && mode === 'open' && !micOpen && !override,
    elsewhere,
    active: status === 'connecting' || status === 'live',
    supported: voiceSupported(),
    start,
    stop: () => stop(),
    setMode,
    pressStart,
    pressEnd,
    speakAnyway,
    takeOver,
    refreshBusy,
  }
}
