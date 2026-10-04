// @vitest-environment jsdom
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import type { InterviewHost } from '@/mocks/interview'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

class FakeChannel {
  readyState = 'connecting'
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  open() {
    this.readyState = 'open'
    this.onopen?.()
  }
  emit(event: object) {
    this.onmessage?.({ data: JSON.stringify(event) })
  }
}

class FakePeer {
  static last: FakePeer | null = null
  channel = new FakeChannel()
  tracks: unknown[] = []
  closed = false
  remote: { type: string; sdp: string } | null = null
  connectionState = 'new'
  onconnectionstatechange: (() => void) | null = null
  ontrack: ((event: { streams: unknown[] }) => void) | null = null
  constructor() {
    FakePeer.last = this
  }
  addTrack(track: unknown) {
    this.tracks.push(track)
  }
  createDataChannel() {
    return this.channel
  }
  async createOffer() {
    return { type: 'offer', sdp: 'v=0 offer' }
  }
  async setLocalDescription() {}
  async setRemoteDescription(description: { type: string; sdp: string }) {
    this.remote = description
  }
  close() {
    this.closed = true
  }
}

const track = { stop: vi.fn() }
const getUserMedia = vi.fn()
const realMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')

beforeEach(() => {
  track.stop.mockClear()
  getUserMedia.mockReset()
  getUserMedia.mockResolvedValue({ getTracks: () => [track] })
  FakePeer.last = null
  vi.stubGlobal('RTCPeerConnection', FakePeer)
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
})
afterEach(() => {
  vi.unstubAllGlobals()
  if (realMediaDevices) Object.defineProperty(navigator, 'mediaDevices', realMediaDevices)
  else Reflect.deleteProperty(navigator, 'mediaDevices')
})

let world: InterviewHost | null = null
const scenario = (name: 'interview-resumed' | 'interview-empty', status?: number) =>
  useScenario(name, {
    tweak: (w) => {
      world = w
      if (status) w.interview.voiceOfferStatus = status
    },
  })

const openInterview = () => renderApp(`/trips/${TRIP_ID}?tab=interview`)
// The interview is a lazy chunk, so the first render in a file can take a while.
const startButton = () =>
  screen.findByRole('button', { name: m.interview_voice_start() }, { timeout: 15_000 })

async function startCall() {
  const user = userEvent.setup()
  openInterview()
  await user.click(await startButton())
  await waitFor(() => expect(FakePeer.last?.remote).not.toBeNull())
  act(() => FakePeer.last?.channel.open())
  return user
}

describe('Wywiad głosowy', () => {
  it('connects on a tap, shows captions of both sides and the AI notice, and hangs up on stop', async () => {
    scenario('interview-resumed')
    const user = await startCall()
    expect(world?.interview.calls).toEqual(['call_1'])
    expect(FakePeer.last?.remote?.sdp).toBe('v=0\r\nmock-answer')
    expect(FakePeer.last?.tracks).toHaveLength(1)
    expect(screen.getByText(m.interview_voice_listening())).toBeTruthy()
    expect(screen.getByText(m.interview_voice_ai_notice())).toBeTruthy()

    act(() => {
      const channel = FakePeer.last?.channel
      channel?.emit({ type: 'conversation.item.added', item: { id: 'u1', role: 'user' } })
      channel?.emit({
        type: 'conversation.item.added',
        previous_item_id: 'u1',
        item: { id: 'a1', role: 'assistant' },
      })
      channel?.emit({
        type: 'response.output_audio_transcript.done',
        item_id: 'a1',
        transcript: 'Gdańsk, trzy dni. Ile osób?',
      })
      channel?.emit({
        type: 'conversation.item.input_audio_transcription.completed',
        item_id: 'u1',
        transcript: 'Gdańsk, trzy dni',
      })
      channel?.emit({ type: 'output_audio_buffer.started' })
    })
    const captions = screen.getByRole('list', { name: m.interview_voice_captions() })
    const items = within(captions)
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '')
    expect(items[0]).toContain('Gdańsk, trzy dni')
    expect(items[1]).toContain('Ile osób?')
    expect(screen.getByText(m.interview_voice_speaking())).toBeTruthy()

    await user.click(screen.getByRole('button', { name: m.interview_voice_stop() }))
    await waitFor(() => expect(world?.interview.hangups).toEqual(['call_1']))
    expect(track.stop).toHaveBeenCalled()
    expect(FakePeer.last?.closed).toBe(true)
    expect(await screen.findByText(m.interview_voice_ended())).toBeTruthy()
    // The captions stay on screen after the call.
    expect(within(captions).getAllByRole('listitem')).toHaveLength(2)
  })

  it('starts the session first when the trip has none', async () => {
    scenario('interview-empty')
    await startCall()
    expect(world?.interview.started).toBe(true)
    expect(world?.interview.calls).toEqual(['call_1'])
  })

  it('does not ask for the microphone before the tap', async () => {
    scenario('interview-resumed')
    openInterview()
    await startButton()
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('tells the host when the microphone is refused and leaves the text field', async () => {
    scenario('interview-empty')
    getUserMedia.mockRejectedValue(new DOMException('no', 'NotAllowedError'))
    const user = userEvent.setup()
    openInterview()
    await user.click(await startButton())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(m.interview_voice_problem_denied())
    expect(screen.getByRole('textbox', { name: m.interview_first_label() })).toBeTruthy()
    expect(world?.interview.calls ?? []).toEqual([])
  })

  it('says so when the browser has no WebRTC', async () => {
    scenario('interview-empty')
    vi.stubGlobal('RTCPeerConnection', undefined)
    const user = userEvent.setup()
    openInterview()
    await user.click(await startButton())
    expect((await screen.findByRole('alert')).textContent).toContain(
      m.interview_voice_problem_unsupported(),
    )
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it.each([
    [409, () => m.interview_voice_problem_busy()],
    [429, () => m.interview_voice_problem_budget()],
    [503, () => m.interview_voice_problem_unavailable()],
  ])('explains a %s from the offer and releases the microphone', async (status, message) => {
    scenario('interview-resumed', status)
    const user = userEvent.setup()
    openInterview()
    await user.click(await startButton())
    expect((await screen.findByRole('alert')).textContent).toContain(message())
    expect(track.stop).toHaveBeenCalled()
    expect(FakePeer.last?.closed).toBe(true)
  })

  it('hangs up when the page closes', async () => {
    scenario('interview-resumed')
    await startCall()
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    await waitFor(() => expect(world?.interview.hangups).toEqual(['call_1']))
    expect(track.stop).toHaveBeenCalled()
  })

  it('ends the call when the connection fails', async () => {
    scenario('interview-resumed')
    await startCall()
    act(() => {
      if (FakePeer.last) FakePeer.last.connectionState = 'failed'
      FakePeer.last?.onconnectionstatechange?.()
    })
    expect((await screen.findByRole('alert')).textContent).toContain(
      m.interview_voice_problem_failed(),
    )
    await waitFor(() => expect(world?.interview.hangups).toEqual(['call_1']))
  })
})
