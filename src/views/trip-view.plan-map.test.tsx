// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PlanMapProps } from '@/components/planning/plan-map'
import { GOOGLE_PLACE_IDS, TRIP_ID } from '@/mocks/fixtures'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// A key is set, as on the deployed app. The real Google loader is replaced by two stubs below.
vi.mock('@/lib/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/env')>()),
  mapsConfig: { apiKey: 'test-key', mapId: 'test-map' },
}))

const placeCardMounts = vi.fn()

/** The map as a row of buttons: one marker per stop, with the props the real map would get. */
vi.mock('@/components/planning/plan-map', () => ({
  PlanMap: ({ stops, onSelectStop, colorScheme }: PlanMapProps) => (
    <div data-testid="plan-map" data-scheme={colorScheme}>
      {stops.map((stop, index) => (
        <button type="button" key={stop.place_id} onClick={() => onSelectStop(stop.place_id)}>
          {`marker ${index + 1}`}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/planning/place-card-google', () => ({
  PlaceCardGoogle: ({ placeId }: { placeId: string }) => {
    placeCardMounts(placeId)
    return <div data-testid="place-card">{placeId}</div>
  },
}))

const openPlan = (search = '') => renderApp(`/trips/${TRIP_ID}?tab=plan${search}`)
const stopLink = (name: RegExp) => screen.findByRole('heading', { name })

describe('Plan: day map', () => {
  it('shows the list on a phone and the map behind a Lista | Mapa switch', async () => {
    openPlan()
    await stopLink(/Zamek Królewski/)
    expect(screen.queryByTestId('plan-map')).toBeNull()

    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: m.plan_view_map() }))
    expect(await screen.findByTestId('plan-map')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Zamek Królewski/ })).toBeNull()
  })

  it('opens on the map from the URL, one marker per stop of the day in plan order', async () => {
    const { router } = openPlan('&view=map')
    const map = await screen.findByTestId('plan-map')
    expect(
      within(map)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['marker 1', 'marker 2', 'marker 3'])
    expect(router.state.location.search).toMatchObject({ view: 'map' })
  })

  it('picking marker 3 goes back to the list and highlights stop 3', async () => {
    openPlan('&view=map')
    const scrolled: Element[] = []
    Element.prototype.scrollIntoView = function scrollIntoView() {
      scrolled.push(this)
    }
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'marker 3' }))

    const heading = await stopLink(/Łazienki Królewskie/)
    const item = heading.closest('li')
    expect(item?.getAttribute('aria-current')).toBe('true')
    expect(scrolled).toContain(item)
    // The other stops are not highlighted.
    expect(
      screen
        .getByRole('heading', { name: /Zamek Królewski/ })
        .closest('li')
        ?.getAttribute('aria-current'),
    ).toBeNull()
  })
})

describe('Plan: place card', () => {
  it('offers the card only for a stop with a Google place id', async () => {
    openPlan()
    await stopLink(/Zamek Królewski/)
    // Two stops of day 1 have no id (bar, park); only the castle has one.
    expect(screen.getAllByRole('button', { name: new RegExp(m.place_card_open()) })).toHaveLength(1)
  })

  it('sends nothing to Google until the card is opened', async () => {
    placeCardMounts.mockClear()
    openPlan()
    await stopLink(/Zamek Królewski/)
    expect(placeCardMounts).not.toHaveBeenCalled()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: new RegExp(m.place_card_open()) }))
    const card = await screen.findByTestId('place-card')
    expect(card.textContent).toBe(GOOGLE_PLACE_IDS.zamek)
    expect(placeCardMounts).toHaveBeenCalledTimes(1)
    // Our own hours chip stays next to it: the plan counts these, not Google's.
    expect(screen.getByText(m.place_card_ours())).toBeTruthy()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('place-card')).toBeNull())
  })
})
