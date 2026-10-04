// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkin, familyMembers, PROFILE_IDS, TRIP_ID, trip } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The form opens a dialog on desktop and a drawer on a phone; the dialog is simpler in jsdom.
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

const open = (search = '') => renderApp(`/trips/${TRIP_ID}?tab=people${search}`)
const list = () => screen.findByRole('list', { name: m.checkin_list_label() })

describe('Zameldowanie', () => {
  it('shows who stays where, with room numbers', async () => {
    open()
    const entries = within(await list()).getAllByRole('listitem')
    expect(entries).toHaveLength(2)
    expect(entries[0]?.textContent).toContain('Hotel Polonia')
    expect(entries[0]?.textContent).toContain(m.checkin_room_value({ room: '214' }))
    expect(entries[1]?.textContent).toContain(m.checkin_room_value({ room: '216' }))
  })

  it('lets the host set their own entry and refreshes the list without a reload', async () => {
    open()
    await list()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: m.checkin_set() }))
    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(m.checkin_accommodation_label()),
      'Pensjonat Róża',
    )
    await user.type(within(dialog).getByLabelText(m.checkin_room_label()), '7')
    await user.click(within(dialog).getByRole('button', { name: m.checkin_save() }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const entries = within(await list()).getAllByRole('listitem')
    expect(entries).toHaveLength(3)
    expect(entries.map((entry) => entry.textContent).join(' ')).toContain('Pensjonat Róża')
  })

  it('asks for an accommodation before saving', async () => {
    open()
    await list()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: m.checkin_set() }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: m.checkin_save() }))
    expect(await within(dialog).findByText(m.checkin_accommodation_required())).toBeTruthy()
  })

  it('lets a member edit only their own entry', async () => {
    useScenario('member-readonly', {
      tweak: (world) => {
        world.checkins = [
          checkin(PROFILE_IDS.mama, { display_name: 'Ola', accommodation: 'Hostel', is_me: true }),
          checkin(PROFILE_IDS.tata, { display_name: 'Marek' }),
        ]
      },
    })
    open()
    await list()
    expect(screen.getByRole('button', { name: m.checkin_edit_for({ name: 'Ola' }) })).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.checkin_edit_for({ name: 'Marek' }) })).toBeNull()
  })

  it('keeps filter, sort and page in the URL and asks the API for them', async () => {
    const queries: string[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname.endsWith('/checkins')) queries.push(url.search)
    })
    const { router } = open('&ci_sort=room&ci_dir=desc&ci_q=pol')
    await list()
    expect(queries.at(-1)).toContain('sort=room')
    expect(queries.at(-1)).toContain('dir=desc')
    expect(queries.at(-1)).toContain('accommodation=pol')

    const user = userEvent.setup()
    await user.clear(screen.getByRole('searchbox', { name: m.checkin_search_label() }))
    await user.type(screen.getByRole('searchbox', { name: m.checkin_search_label() }), 'xyz')
    expect(await screen.findByText(m.checkin_no_match())).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ ci_q: 'xyz' })
  })

  it('says so when the entries cannot be loaded', async () => {
    server.use(
      http.get('*/api/v1/trips/:tripId/checkins', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    open()
    expect(await screen.findByText(m.checkin_load_failed_title())).toBeTruthy()
  })

  it("lets a co-host edit only their own entry: filling in for others is the host's", async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        world.trips = [trip({ my_role: 'co_host' })]
        world.members = familyMembers('co_host')
        world.checkins = [
          checkin(PROFILE_IDS.mama, { display_name: 'Ola', accommodation: 'Hostel', is_me: true }),
          checkin(PROFILE_IDS.zosia, { display_name: 'Zosia' }),
        ]
      },
    })
    open()
    await list()
    expect(screen.getByRole('button', { name: m.checkin_edit_for({ name: 'Ola' }) })).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.checkin_edit_for({ name: 'Zosia' }) })).toBeNull()
  })

  it('lets the host edit the entry of a person without an account', async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        world.checkins = [checkin(PROFILE_IDS.zosia, { display_name: 'Zosia' })]
      },
    })
    open()
    await list()
    expect(screen.getByRole('button', { name: m.checkin_edit_for({ name: 'Zosia' }) })).toBeTruthy()
  })

  it('says the check-ins are closed when the trip is over (409)', async () => {
    server.use(
      http.put('*/api/v1/trips/:tripId/checkins/:profileId', () =>
        HttpResponse.json({ detail: 'ended' }, { status: 409 }),
      ),
    )
    open()
    await list()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: m.checkin_set() }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(m.checkin_accommodation_label()), 'Hostel')
    await user.click(within(dialog).getByRole('button', { name: m.checkin_save() }))
    expect(await within(dialog).findByText(m.checkin_save_ended())).toBeTruthy()
  })

  it('waits for a pause in typing before asking the API', async () => {
    const queries: string[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname.endsWith('/checkins')) queries.push(url.search)
    })
    open()
    await list()
    const before = queries.length
    const user = userEvent.setup()
    await user.type(screen.getByRole('searchbox', { name: m.checkin_search_label() }), 'pol')
    // Three keystrokes, one request after the pause.
    await waitFor(() => expect(queries.length).toBe(before + 1))
    expect(queries.at(-1)).toContain('accommodation=pol')
  })
})
