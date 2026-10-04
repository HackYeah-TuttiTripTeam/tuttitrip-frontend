// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stopSharingBeforeLogout } from '@/hooks/use-locations'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'
import { useLocationStore } from '@/stores/location-store'

const open = () => renderApp(`/trips/${TRIP_ID}?tab=locations`)

/** A device that answers (or refuses) the first position request. */
function stubGeolocation(result: 'ok' | 'denied') {
  const getCurrentPosition = vi.fn((success: PositionCallback, failure: PositionErrorCallback) => {
    if (result === 'ok') {
      success({
        coords: { latitude: 52.23, longitude: 21.01, accuracy: 15 },
      } as GeolocationPosition)
    } else {
      failure({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError)
    }
  })
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  })
  return getCurrentPosition
}

/** Records "METHOD path" of every request to the locations endpoints. */
function recordLocationCalls() {
  const calls: string[] = []
  server.events.on('request:start', ({ request }) => {
    const path = new URL(request.url).pathname
    if (path.includes('/locations')) calls.push(`${request.method} ${path.split('/locations')[1]}`)
  })
  return calls
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation')
  useLocationStore.getState().setStatus('idle')
  for (const id of useLocationStore.getState().activeTrips) {
    useLocationStore.getState().setActive(id, false)
  }
})

describe('Lokalizacje', () => {
  it('shows the last positions of people who share, with how long ago', async () => {
    useScenario('others-share-location')
    open()
    const list = await screen.findByRole('list', { name: m.locations_list_label() })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.textContent).toContain('Marek')
    expect(rows[1]?.textContent).toContain('Babcia Halina')
    expect(rows[1]?.textContent).toMatch(/6 min temu/)
    // No Google key in tests: the map is replaced by a note.
    expect(screen.getByText(m.plan_map_unavailable())).toBeTruthy()
  })

  it('says nobody shares when nobody does', async () => {
    open()
    expect(await screen.findByText(m.locations_empty_title())).toBeTruthy()
  })

  it('shares nothing until the person opts in', async () => {
    stubGeolocation('ok')
    const calls = recordLocationCalls()
    open()
    expect(await screen.findByText(m.share_off())).toBeTruthy()
    expect(calls.some((call) => call.startsWith('PUT'))).toBe(false)
  })

  it('starts sharing for the chosen time and stops with one press', async () => {
    stubGeolocation('ok')
    const calls = recordLocationCalls()
    open()
    const user = userEvent.setup()
    await screen.findByText(m.share_off())
    await user.click(screen.getByRole('radio', { name: m.share_duration_hours({ hours: 12 }) }))
    await user.click(screen.getByRole('button', { name: m.share_start() }))

    expect(await screen.findByText(/Udostępniasz lokalizację do/)).toBeTruthy()
    expect(calls).toContain('PUT /me/consent')
    expect(calls).toContain('PUT /me')
    // The first position is sent right away; our own marker shows in the list.
    expect(await screen.findByRole('list', { name: m.locations_list_label() })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: m.share_stop() }))
    expect(await screen.findByText(m.share_off())).toBeTruthy()
    expect(calls).toContain('DELETE /me')
    await waitFor(() =>
      expect(screen.queryByRole('list', { name: m.locations_list_label() })).toBeNull(),
    )
  })

  it('stores no consent when the device refuses the location', async () => {
    stubGeolocation('denied')
    const calls = recordLocationCalls()
    open()
    const user = userEvent.setup()
    await screen.findByText(m.share_off())
    await user.click(screen.getByRole('button', { name: m.share_start() }))
    expect(await screen.findByText(m.share_denied())).toBeTruthy()
    expect(calls.some((call) => call.startsWith('PUT'))).toBe(false)
    expect(screen.getByText(m.share_off())).toBeTruthy()
  })

  it('explains a browser without geolocation', async () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true })
    Reflect.deleteProperty(navigator, 'geolocation')
    open()
    expect(await screen.findByText(m.share_unsupported())).toBeTruthy()
  })

  it('does not read the position of a consent that another window started, until resumed', async () => {
    const geolocation = stubGeolocation('ok')
    const calls = recordLocationCalls()
    useScenario('family-warsaw', {
      tweak: (world) => {
        world.consent = { enabled: true, until: new Date(Date.now() + 3_600_000).toISOString() }
      },
    })
    open()
    const user = userEvent.setup()
    expect(await screen.findByText(m.share_resume_hint())).toBeTruthy()
    expect(geolocation).not.toHaveBeenCalled()
    expect(calls.some((call) => call === 'PUT /me')).toBe(false)

    await user.click(screen.getByRole('button', { name: m.share_resume() }))
    await waitFor(() => expect(calls).toContain('PUT /me'))
    expect(geolocation).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText(m.share_resume_hint())).toBeNull())
  })

  it('shows the error when the first position cannot be sent, and the state of the server', async () => {
    stubGeolocation('ok')
    server.use(
      http.put('*/api/v1/trips/:tripId/locations/me', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    open()
    const user = userEvent.setup()
    await screen.findByText(m.share_off())
    await user.click(screen.getByRole('button', { name: m.share_start() }))
    expect(await screen.findByText(m.share_send_failed())).toBeTruthy()
    // The consent was granted, and the page says so instead of staying on "off".
    expect(await screen.findByText(/Udostępniasz lokalizację do/)).toBeTruthy()
  })

  it('withdraws the sharing this tab runs when the session ends', async () => {
    const calls = recordLocationCalls()
    useLocationStore.getState().setActive(TRIP_ID, true)
    await stopSharingBeforeLogout()
    expect(calls).toContain('DELETE /me')
    expect(useLocationStore.getState().activeTrips).toEqual([])
  })
})
