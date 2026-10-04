// @vitest-environment jsdom
import { act, configure, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import type { InterviewHost } from '@/mocks/interview'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'
import { overwriteGetLocale } from '@/paraglide/runtime'

// A lazy chunk, fake timers of real length and a loaded machine: 1 s and 5 s are not enough.
configure({ asyncUtilTimeout: 10_000 })
vi.setConfig({ testTimeout: 30_000 })

class FakeChannel {
  readyState = 'connecting'
  /** Events the browser sent the provider, parsed. */
  sent: { type: string; [key: string]: unknown }[] = []
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
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

const track = { stop: vi.fn(), enabled: true }
const getUserMedia = vi.fn()
const realMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')

beforeEach(() => {
  localStorage.clear()
  track.stop.mockClear()
  track.enabled = true
  getUserMedia.mockReset()
  getUserMedia.mockResolvedValue({ getTracks: () => [track], getAudioTracks: () => [track] })
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
    expect(screen.getByText(m.voice_activity_listening())).toBeTruthy()
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
    expect(screen.getByText(m.voice_activity_speaking())).toBeTruthy()

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

// --- #147: state of the call, muted microphone, hold-to-talk, a lock left elsewhere ---

const emit = (event: object) => act(() => FakePeer.last?.channel.emit(event))
const sent = () => FakePeer.last?.channel.sent.map((event) => event.type) ?? []
const status = (text: string) => screen.findByText(text, undefined, { timeout: 5000 })

describe('Wywiad głosowy, co się dzieje', () => {
  it('names each phase: hearing, thinking, saving a field, saved, building the plan, speaking', async () => {
    scenario('interview-resumed')
    let knowledgeReads = 0
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/interview/knowledge')) knowledgeReads += 1
    })
    await startCall()
    expect(screen.getByText(m.voice_activity_listening())).toBeTruthy()

    emit({ type: 'input_audio_buffer.speech_started' })
    await status(m.voice_activity_hearing())
    emit({ type: 'input_audio_buffer.speech_stopped' })
    await status(m.voice_activity_thinking())

    emit({ type: 'response.created' })
    emit({
      type: 'response.output_item.added',
      item: { type: 'function_call', call_id: 'c1', name: 'set_budget' },
    })
    await status(m.voice_activity_saving({ what: m.voice_what_budget() }))
    const before = knowledgeReads
    emit({
      type: 'conversation.item.added',
      item: { type: 'function_call_output', call_id: 'c1', output: '{"min":300}' },
    })
    await status(m.voice_saved({ what: m.voice_what_budget() }))
    // The panel refreshes after every tool call, not on a timer.
    await waitFor(() => expect(knowledgeReads).toBeGreaterThan(before))

    emit({
      type: 'response.output_item.added',
      item: { type: 'function_call', call_id: 'c2', name: 'build_plan_now' },
    })
    await status(m.voice_activity_building_plan())
    emit({
      type: 'conversation.item.added',
      item: { type: 'function_call_output', call_id: 'c2', output: 'NOT BUILT: no city' },
    })
    await status(m.voice_not_saved({ what: m.voice_what_plan() }))

    emit({ type: 'output_audio_buffer.started' })
    await status(m.voice_activity_speaking())
  })

  it('mutes the microphone from the end of the host speech until the answer is over', async () => {
    scenario('interview-resumed')
    await startCall()
    await waitFor(() => expect(track.enabled).toBe(true))

    emit({ type: 'input_audio_buffer.speech_started' })
    emit({ type: 'input_audio_buffer.speech_stopped' })
    await waitFor(() => expect(track.enabled).toBe(false))
    expect(screen.getByText(m.voice_mic_muted())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.voice_mic_override() })).toBeTruthy()

    emit({ type: 'response.created' })
    emit({ type: 'output_audio_buffer.started' })
    emit({ type: 'response.done' })
    expect(track.enabled).toBe(false) // the voice is still playing
    emit({ type: 'output_audio_buffer.stopped' })
    await waitFor(() => expect(track.enabled).toBe(true), { timeout: 5000 })
    expect(screen.getByText(m.voice_mic_open())).toBeTruthy()
  })

  it('"Speak anyway" opens the microphone and cuts the assistant off', async () => {
    scenario('interview-resumed')
    const user = await startCall()
    emit({ type: 'input_audio_buffer.speech_stopped' })
    emit({ type: 'response.created' })
    emit({ type: 'output_audio_buffer.started' })
    await waitFor(() => expect(track.enabled).toBe(false))
    await user.click(screen.getByRole('button', { name: m.voice_mic_override() }))
    await waitFor(() => expect(track.enabled).toBe(true))
    expect(sent()).toEqual(expect.arrayContaining(['response.cancel', 'output_audio_buffer.clear']))
    expect(screen.queryByRole('button', { name: m.voice_mic_override() })).toBeNull()
  })

  it('sends the interface language with the offer', async () => {
    scenario('interview-resumed')
    const bodies: unknown[] = []
    server.events.on('request:start', async ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/voice/offer')) {
        bodies.push(await request.clone().json())
      }
    })
    overwriteGetLocale(() => 'en')
    await startCall()
    expect(bodies).toEqual([{ sdp: 'v=0 offer', locale: 'en' }])
  })
})

describe('Wywiad głosowy, przytrzymaj, aby mówić', () => {
  const holdButton = () => screen.findByRole('button', { name: m.voice_ptt_button() })

  async function startPtt() {
    scenario('interview-resumed')
    const user = userEvent.setup()
    openInterview()
    await user.click(
      await screen.findByRole('switch', { name: m.voice_ptt_toggle() }, { timeout: 15_000 }),
    )
    await user.click(await startButton())
    await waitFor(() => expect(FakePeer.last?.remote).not.toBeNull())
    act(() => FakePeer.last?.channel.open())
    return user
  }

  it('turns the server voice detection off and keeps the microphone shut until the button is held', async () => {
    await startPtt()
    const update = FakePeer.last?.channel.sent.find((event) => event.type === 'session.update')
    expect(update).toMatchObject({
      session: { audio: { input: { turn_detection: null } } },
    })
    await waitFor(() => expect(track.enabled).toBe(false))
    expect(screen.getByText(m.voice_mic_muted_ptt())).toBeTruthy()
  })

  it('listens while the button is held, sends the words on release and keeps the call', async () => {
    await startPtt()
    const button = await holdButton()
    fireEvent.pointerDown(button, { pointerId: 1 })
    await waitFor(() => expect(track.enabled).toBe(true))
    expect(
      screen.getByRole('button', { name: m.voice_ptt_held() }).getAttribute('aria-pressed'),
    ).toBe('true')
    await new Promise((resolve) => setTimeout(resolve, 350))
    fireEvent.pointerUp(button, { pointerId: 1 })
    await waitFor(() => expect(track.enabled).toBe(false))
    expect(sent()).toEqual(expect.arrayContaining(['input_audio_buffer.commit', 'response.create']))
    // Letting go does not end the call.
    expect(world?.interview.hangups).toEqual([])
    expect(track.stop).not.toHaveBeenCalled()
    expect(FakePeer.last?.closed).toBe(false)
  })

  it('drops a tap that was too short to be speech', async () => {
    await startPtt()
    const button = await holdButton()
    fireEvent.pointerDown(button, { pointerId: 1 })
    fireEvent.pointerUp(button, { pointerId: 1 })
    await waitFor(() => expect(sent()).toContain('input_audio_buffer.clear'))
    expect(sent()).not.toContain('input_audio_buffer.commit')
  })

  it('works from the keyboard with the space bar', async () => {
    await startPtt()
    const button = await holdButton()
    fireEvent.keyDown(button, { key: ' ' })
    await waitFor(() => expect(track.enabled).toBe(true))
    fireEvent.keyDown(button, { key: ' ', repeat: true }) // a held key repeats: still one press
    await new Promise((resolve) => setTimeout(resolve, 350))
    fireEvent.keyUp(button, { key: ' ' })
    await waitFor(() => expect(sent()).toContain('input_audio_buffer.commit'))
    expect(track.enabled).toBe(false)
  })

  it('cuts off the answer that is playing when the button is pressed', async () => {
    await startPtt()
    emit({ type: 'response.created' })
    emit({ type: 'output_audio_buffer.started' })
    fireEvent.pointerDown(await holdButton(), { pointerId: 1 })
    await waitFor(() => expect(sent()).toContain('response.cancel'))
  })

  it('only the square ends the call', async () => {
    const user = await startPtt()
    const button = await holdButton()
    fireEvent.pointerDown(button, { pointerId: 1 })
    fireEvent.pointerUp(button, { pointerId: 1 })
    await user.click(screen.getByRole('button', { name: m.interview_voice_stop() }))
    await waitFor(() => expect(world?.interview.hangups).toEqual(['call_1']))
    expect(track.stop).toHaveBeenCalled()
  })

  it('remembers the choice', async () => {
    const user = await startPtt()
    expect(localStorage.getItem('tt.voice.mode')).toBe('ptt')
    await user.click(screen.getByRole('switch', { name: m.voice_ptt_toggle() }))
    expect(localStorage.getItem('tt.voice.mode')).toBe('open')
    expect(
      FakePeer.last?.channel.sent.filter((event) => event.type === 'session.update'),
    ).toHaveLength(2)
  })
})

describe('Wywiad głosowy, koniec rozmowy', () => {
  it('says the fields are filled in while the server answers the hang-up', async () => {
    scenario('interview-resumed')
    let finish: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      finish = resolve
    })
    server.use(
      http.post('*/api/v1/trips/:tripId/interview/voice/:callId/hangup', async () => {
        await gate
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = await startCall()
    await user.click(screen.getByRole('button', { name: m.interview_voice_stop() }))
    expect(await screen.findByText(m.voice_activity_finishing())).toBeTruthy()
    expect(track.stop).toHaveBeenCalled() // the microphone is already free
    finish()
    expect(await screen.findByText(m.interview_voice_ended())).toBeTruthy()
    expect(screen.queryByText(m.voice_activity_finishing())).toBeNull()
  })
})

describe('Wywiad głosowy, blokada z innego urządzenia', () => {
  it('says a call runs elsewhere and ends it on request, then the host can start', async () => {
    useScenario('interview-resumed', {
      tweak: (w) => {
        world = w
        w.interview.running = 'voice'
      },
    })
    const user = userEvent.setup()
    openInterview()
    await user.click(await startButton())
    expect(await screen.findByText(m.voice_elsewhere_voice())).toBeTruthy()
    expect(world?.interview.calls).toEqual([])
    expect(getUserMedia).not.toHaveBeenCalled() // no microphone prompt for a call that cannot start
    await user.click(screen.getByRole('button', { name: m.voice_elsewhere_end() }))
    await waitFor(() => expect(world?.interview.releases).toBe(1))
    await waitFor(() => expect(screen.queryByText(m.voice_elsewhere_voice())).toBeNull())
    await user.click(await startButton())
    await waitFor(() => expect(world?.interview.calls).toEqual(['call_1']))
  })

  it('explains a 409 on a text message the same way and lets the host take over', async () => {
    useScenario('interview-resumed', {
      tweak: (w) => {
        world = w
        w.interview.running = 'voice'
      },
    })
    const user = userEvent.setup()
    openInterview()
    const field = await screen.findByRole('textbox', { name: m.interview_composer_label() })
    await user.type(field, 'Dodaj muzea')
    await user.click(screen.getByRole('button', { name: m.interview_send() }))
    expect(await screen.findByText(m.voice_elsewhere_voice())).toBeTruthy()
    await user.click(screen.getByRole('button', { name: m.voice_elsewhere_end() }))
    await waitFor(() => expect(world?.interview.releases).toBe(1))
    // The message is still there to send again.
    await user.click(await screen.findByRole('button', { name: m.action_retry() }))
    expect(await screen.findByText(/Gdańsk na trzy dni/)).toBeTruthy()
  })

  it('tells a busy text turn apart from a call', async () => {
    useScenario('interview-resumed', {
      tweak: (w) => {
        world = w
        w.interview.running = 'text'
      },
    })
    const user = userEvent.setup()
    openInterview()
    await user.click(await startButton())
    expect(await screen.findByText(m.voice_elsewhere_text())).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.voice_elsewhere_end() })).toBeNull()
  })
})
