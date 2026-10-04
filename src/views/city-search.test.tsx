// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { CITY_SEARCH_DEBOUNCE_MS } from '@/lib/constants'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'
import { useUiStore } from '@/stores/ui-store'

// The "new trip" dialog is open in a store: a test that ends with it open must not leak it.
beforeEach(() => useUiStore.setState({ createTripOpen: false }))

const searches: string[] = []
const bodies: Promise<Record<string, unknown> | null>[] = []

const record = () => {
  searches.length = 0
  bodies.length = 0
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname.endsWith('/places/cities/search'))
      searches.push(url.searchParams.get('q') ?? '')
    if (request.method === 'POST' && url.pathname.endsWith('/trips')) {
      bodies.push(
        request
          .clone()
          .json()
          .catch(() => null),
      )
    }
  })
}

const openCreate = async () => {
  renderApp('/trips')
  fireEvent.click(
    (await screen.findAllByRole('button', { name: m.action_new_trip() }))[0] as HTMLElement,
  )
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText(m.trip_form_name_label()), {
    target: { value: 'Weekend' },
  })
  return dialog
}

const openPlace = async (dialog: HTMLElement) => {
  const user = userEvent.setup()
  await user.click(within(dialog).getByRole('combobox', { name: m.trip_form_place_label() }))
  const input = await screen.findByPlaceholderText(m.city_search_input_placeholder())
  return { user, input }
}

describe('the place field of the trip form', () => {
  it('asks only after the typing pauses, catalog cities first with their marker', async () => {
    record()
    const { user, input } = await openPlace(await openCreate())
    await user.type(input, 'lon')
    expect(searches).toEqual([])
    await screen.findByText('Londyn', undefined, { timeout: CITY_SEARCH_DEBOUNCE_MS * 6 })
    expect(searches).toEqual(['lon'])
    expect(screen.getByText(m.city_search_osm())).toBeTruthy()
  })

  it('sets the city and the destination from one choice', async () => {
    record()
    const dialog = await openCreate()
    const { user, input } = await openPlace(dialog)
    await user.type(input, 'lis')
    await user.click(await screen.findByRole('option', { name: /Lisboa/ }))
    expect(within(dialog).getByRole('combobox', { name: /Lisboa/ })).toBeTruthy()
    expect(screen.getByText(m.trip_form_place_fetch_note())).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: m.trip_form_submit() }))
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(await bodies[0]).toMatchObject({
      destination: 'Lisboa',
      city_slug: 'lisboa-portugal',
    })
  })

  it('marks a catalog city whose places are ready', async () => {
    const { user, input } = await openPlace(await openCreate())
    await user.type(input, 'war')
    const option = await screen.findByRole('option', { name: /Warszawa/ })
    expect(within(option).getByText(m.city_search_ready())).toBeTruthy()
  })

  it('offers the typed text as a destination when nothing matches', async () => {
    record()
    const dialog = await openCreate()
    const { user, input } = await openPlace(dialog)
    await user.type(input, 'Bieszczady')
    expect(await screen.findByText(m.city_search_empty({ query: 'Bieszczady' }))).toBeTruthy()
    await user.click(screen.getByText(m.city_search_use_typed({ query: 'Bieszczady' })))
    fireEvent.click(within(dialog).getByRole('button', { name: m.trip_form_submit() }))
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(await bodies[0]).toMatchObject({ destination: 'Bieszczady', city_slug: null })
  })

  it('says it is waiting for letters, with a status for screen readers', async () => {
    record()
    const { user, input } = await openPlace(await openCreate())
    expect(screen.getByRole('status').textContent).toBe(m.city_search_min())
    await user.type(input, 'l')
    expect(searches).toEqual([])
    expect(screen.getByRole('status').textContent).toBe(m.city_search_min())
  })

  it('shows an error with a way to try again', async () => {
    useScenario('city-search-error')
    const { user, input } = await openPlace(await openCreate())
    await user.type(input, 'lis')
    expect(await screen.findByText(m.city_search_error())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
  })

  it('keeps the catalog and says the map part is missing', async () => {
    useScenario('city-search-geocoder-down')
    const { user, input } = await openPlace(await openCreate())
    await user.type(input, 'lon')
    expect(await screen.findByRole('option', { name: /Londyn/ })).toBeTruthy()
    expect(screen.getByText(m.city_search_geocoder_down())).toBeTruthy()
  })
})

describe('the budget of the trip form', () => {
  it('has no slider, so no amount is capped by it', async () => {
    const dialog = await openCreate()
    fireEvent.click(within(dialog).getByText(m.trip_form_more()))
    expect(within(dialog).queryByRole('slider')).toBeNull()
    fireEvent.click(within(dialog).getByRole('radio', { name: m.trip_form_budget_scope_day() }))
    const [min] = within(dialog).getAllByLabelText(m.trip_form_budget_min_label())
    const [max] = within(dialog).getAllByLabelText(m.trip_form_budget_max_label())
    fireEvent.change(min as HTMLElement, { target: { value: '1500' } })
    fireEvent.change(max as HTMLElement, { target: { value: '25000' } })
    expect((max as HTMLInputElement).value).toBe('25000')
    fireEvent.click(within(dialog).getByRole('button', { name: m.trip_form_submit() }))
    expect(within(dialog).queryByText(m.trip_form_money_invalid())).toBeNull()
  })
})
