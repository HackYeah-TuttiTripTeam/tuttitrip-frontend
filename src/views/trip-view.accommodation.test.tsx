// @vitest-environment jsdom
import { cleanup, configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/lib/query-client'
import { OUTING_ID, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 10_000 })
// A whole app render per test; the build machines are busy.
vi.setConfig({ testTimeout: 60_000 })

// Dialogs instead of drawers: simpler in jsdom.
const realMatchMedia = window.matchMedia
beforeAll(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
})
afterAll(() => {
  window.matchMedia = realMatchMedia
})
afterEach(() => vi.restoreAllMocks())

const openStays = (id = TRIP_ID) => renderApp(`/trips/${id}?tab=accommodation`)
const poolSwitch = () => screen.findByRole('switch', { name: 'Basen' })

function recordCalls() {
  const calls: { method: string; path: string; body: unknown }[] = []
  server.events.on('request:start', async ({ request }) => {
    calls.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: await request
        .clone()
        .json()
        .catch(() => null),
    })
  })
  return calls
}

const hardPool = {
  tweak: (world: import('@/mocks/scenarios').World) => {
    world.requirements = {
      requirements: [{ kind: 'amenity', key: 'pool', hard: true }],
      version: 1,
    }
  },
}

async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(await screen.findByLabelText(m.offer_text_label()))
  await user.paste(text)
  await user.click(screen.getByRole('button', { name: m.offer_check() }))
}

describe('Noclegi tab', () => {
  it('says an outing has no stays instead of showing an empty form', async () => {
    openStays(OUTING_ID)
    expect(await screen.findByText(m.accommodation_outing_title())).toBeTruthy()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('saves a requirement as hard and keeps it after a reload', async () => {
    const user = userEvent.setup()
    openStays()
    await user.click(await poolSwitch())
    const strength = await screen.findByRole('radiogroup', {
      name: m.requirements_strength({ label: 'Basen' }),
    })
    await user.click(within(strength).getByRole('radio', { name: m.requirements_hard() }))

    // A reload: nothing cached, everything read from the API again.
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    cleanup()
    queryClient.clear()
    openStays()
    expect((await poolSwitch()).getAttribute('aria-checked')).toBe('true')
    const again = await screen.findByRole('radiogroup', {
      name: m.requirements_strength({ label: 'Basen' }),
    })
    expect(
      within(again)
        .getByRole('radio', { name: m.requirements_hard() })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('shows the requirements to a member without a way to change them', async () => {
    useScenario('member-readonly', hardPool)
    openStays()
    const pool = await poolSwitch()
    expect(pool.getAttribute('aria-checked')).toBe('true')
    expect(pool.hasAttribute('disabled')).toBe(true)
    expect(screen.queryByLabelText(m.offer_text_label())).toBeNull()
    expect(screen.queryByRole('button', { name: m.accommodation_search() })).toBeNull()
  })
})

describe('checking a pasted offer', () => {
  it('marks a requirement the offer is silent about as not confirmed, with the reason in words', async () => {
    useScenario('family-warsaw', hardPool)
    const user = userEvent.setup()
    openStays()
    await paste(user, 'Przytulny apartament w centrum. Jest kuchnia i parking.')
    // No quote to open, so the chip is a plain label.
    expect(await screen.findByText(/Basen: niepotwierdzone/)).toBeTruthy()
    expect(screen.getByText(m.accommodation_reason_no_mention())).toBeTruthy()
  })

  it('shows the quote of a met requirement when the chip is opened', async () => {
    useScenario('family-warsaw', hardPool)
    const user = userEvent.setup()
    openStays()
    await paste(user, 'Apartament z widokiem. Na dachu jest basen dla gości.')
    const chip = await screen.findByRole('button', { name: /Basen: spełnione/ })
    expect(screen.queryByText(/Na dachu jest basen/)).toBeNull()
    await user.click(chip)
    expect(await screen.findByText(/Na dachu jest basen dla gości/)).toBeTruthy()
  })

  it('keeps the result in the URL and calls an old result stale after a requirement changes', async () => {
    useScenario('family-warsaw', hardPool)
    const user = userEvent.setup()
    const { router } = openStays()
    await paste(user, 'Jest basen.')
    await screen.findByRole('button', { name: /Basen: spełnione/ })
    expect(router.state.location.search).toMatchObject({ offer: expect.any(String) })

    await user.click(await screen.findByRole('switch', { name: 'Kuchnia' }))
    expect(await screen.findByText(m.offer_stale())).toBeTruthy()
    await user.click(screen.getByRole('button', { name: m.offer_recheck() }))
    await waitFor(() => expect(screen.queryByText(m.offer_stale())).toBeNull())
    expect(await screen.findByText(/Kuchnia: niepotwierdzone/)).toBeTruthy()
  })

  it('asks for the text before sending anything', async () => {
    const user = userEvent.setup()
    openStays()
    const calls = recordCalls()
    await user.click(await screen.findByRole('button', { name: m.offer_check() }))
    expect(await screen.findByText(m.offer_text_required())).toBeTruthy()
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0)
  })
})

describe('searching for stays', () => {
  it('shows the approval card first and opens nothing until "Otwórz"', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = userEvent.setup()
    openStays()
    const calls = recordCalls()
    await user.click(await screen.findByRole('button', { name: m.accommodation_search() }))

    const card = await screen.findByRole('dialog', { name: m.search_title() })
    expect(within(card).getByText(/10 paź.*11 paź/)).toBeTruthy()
    expect(within(card).getByText(/9, 3/)).toBeTruthy()
    expect(within(card).getByText('Warszawa')).toBeTruthy()
    expect(within(card).getByText(/1\s600\szł/)).toBeTruthy()
    // The platform does not document one parameter: the card says so.
    expect(within(card).getByText(/price_max/)).toBeTruthy()
    expect(open).not.toHaveBeenCalled()

    await user.click(
      within(card).getByRole('button', { name: m.search_open({ platform: 'Airbnb' }) }),
    )
    expect(open).toHaveBeenCalledWith(expect.stringContaining('airbnb.com'), '_blank', 'noopener')
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'POST' &&
            call.path.endsWith('/search-links/opened') &&
            JSON.stringify(call.body) === JSON.stringify({ platform: 'airbnb' }),
        ),
      ).toBe(true),
    )
    // After coming back, the screen points at the paste field.
    expect(await screen.findByText(m.accommodation_returned())).toBeTruthy()
  })

  it('opens nothing and logs nothing on "Anuluj"', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = userEvent.setup()
    openStays()
    const calls = recordCalls()
    await user.click(await screen.findByRole('button', { name: m.accommodation_search() }))
    const card = await screen.findByRole('dialog', { name: m.search_title() })
    await user.click(within(card).getByRole('button', { name: m.search_cancel() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(open).not.toHaveBeenCalled()
    expect(calls.some((call) => call.path.endsWith('/search-links/opened'))).toBe(false)
  })

  it('offers only Airbnb when the requirement says so', async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        world.requirements = {
          requirements: [{ kind: 'platform', key: 'airbnb', hard: true }],
          version: 1,
        }
      },
    })
    const user = userEvent.setup()
    openStays()
    await user.click(await screen.findByRole('button', { name: m.accommodation_search() }))
    const card = await screen.findByRole('dialog', { name: m.search_title() })
    expect(
      within(card).getByRole('button', { name: m.search_open({ platform: 'Airbnb' }) }),
    ).toBeTruthy()
    expect(
      within(card).queryByRole('button', { name: m.search_open({ platform: 'Booking.com' }) }),
    ).toBeNull()
  })
})
