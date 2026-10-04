// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const createByVoice = async (user: ReturnType<typeof userEvent.setup>, name = 'Gdańsk w maju') => {
  await user.click(await screen.findByRole('button', { name: m.trip_voice_action() }))
  await user.type(await screen.findByRole('textbox', { name: m.trip_form_name_label() }), name)
  await user.click(screen.getByRole('button', { name: m.trip_voice_submit() }))
}

const setUserActivation = (isActive: boolean) =>
  Object.defineProperty(navigator, 'userActivation', {
    value: { isActive, hasBeenActive: true },
    configurable: true,
  })

afterEach(() => Reflect.deleteProperty(navigator, 'userActivation'))

describe('Utwórz głosowo', () => {
  it('sends only the name, lands on the interview and waits for the tap when the gesture is gone', async () => {
    scenario('interview-empty')
    setUserActivation(false)
    const user = userEvent.setup()
    const { router } = renderApp('/trips')
    await createByVoice(user)

    const begin = await screen.findByRole(
      'button',
      { name: m.interview_voice_begin() },
      { timeout: 15_000 },
    )
    const created = world?.trips[0]
    expect(created?.name).toBe('Gdańsk w maju')
    expect(created?.destination).toBeNull()
    expect(router.state.location.pathname).toBe(`/trips/${created?.id}`)
    // The param is consumed: a reload does not start the call again.
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('voice'))
    expect(getUserMedia).not.toHaveBeenCalled()

    await user.click(begin)
    await waitFor(() => expect(FakePeer.last?.remote).not.toBeNull())
    expect(world?.interview.calls).toEqual(['call_1'])
    expect(screen.queryByRole('button', { name: m.interview_voice_begin() })).toBeNull()
  })

  it('starts the call by itself while the click still counts as a gesture', async () => {
    scenario('interview-empty')
    setUserActivation(true)
    const user = userEvent.setup()
    renderApp('/trips')
    await createByVoice(user)
    await waitFor(() => expect(world?.interview.calls).toEqual(['call_1']), { timeout: 15_000 })
    expect(screen.queryByRole('button', { name: m.interview_voice_begin() })).toBeNull()
  })

  it('asks for a name before creating anything', async () => {
    scenario('interview-empty')
    const user = userEvent.setup()
    const before = world?.trips.length
    renderApp('/trips')
    await user.click(await screen.findByRole('button', { name: m.trip_voice_action() }))
    await user.click(screen.getByRole('button', { name: m.trip_voice_submit() }))
    expect(await screen.findByText(m.trip_form_name_required())).toBeTruthy()
    expect(world?.trips.length).toBe(before)
  })

  it('falls back to the text interview when the microphone is refused', async () => {
    scenario('interview-empty')
    setUserActivation(true)
    getUserMedia.mockRejectedValue(new DOMException('no', 'NotAllowedError'))
    const user = userEvent.setup()
    renderApp('/trips')
    await createByVoice(user)
    const alert = await screen.findByRole('alert', {}, { timeout: 15_000 })
    expect(alert.textContent).toContain(m.interview_voice_problem_denied())
    expect(screen.getByRole('textbox', { name: m.interview_first_label() })).toBeTruthy()
  })

  it.each([
    [409, () => m.interview_voice_problem_busy()],
    [429, () => m.interview_voice_problem_budget()],
    [503, () => m.interview_voice_problem_unavailable()],
  ])('explains a %s from the offer and keeps the text interview', async (status, message) => {
    scenario('interview-empty', status)
    setUserActivation(true)
    const user = userEvent.setup()
    renderApp('/trips')
    await createByVoice(user)
    const alert = await screen.findByRole('alert', {}, { timeout: 15_000 })
    expect(alert.textContent).toContain(message())
    expect(screen.getByRole('textbox', { name: m.interview_first_label() })).toBeTruthy()
  })

  it('shows an error and stays on the list when creating fails', async () => {
    useScenario('interview-empty', {
      tweak: (w) => {
        w.failures.post = 500
      },
    })
    const user = userEvent.setup()
    const { router } = renderApp('/trips')
    await createByVoice(user)
    expect((await screen.findByRole('alert')).textContent).toContain(m.trip_form_save_failed())
    expect(router.state.location.pathname).toBe('/trips')
  })
})
