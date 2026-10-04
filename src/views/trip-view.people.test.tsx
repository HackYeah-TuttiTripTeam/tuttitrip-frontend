// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PROFILE_IDS, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const PROFILES = '*/api/v1/trips/:tripId/profiles'
const PROFILE = `${PROFILES}/:profileId`

// The builder opens a dialog on desktop and a drawer on a phone; the dialog is simpler in jsdom.
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

const openPeople = () => renderApp(`/trips/${TRIP_ID}?tab=people`)

const personItem = async (name: string) => {
  const list = await screen.findByRole('list', { name: m.people_list_label() })
  const item = within(list)
    .getAllByRole('listitem')
    .find((candidate) => candidate.textContent?.includes(name))
  if (!item) throw new Error(`no ${name} in the list`)
  return item
}

/** Records the JSON bodies of the requests to a handler's route, in order. */
function recordBodies(method: 'post' | 'patch' | 'delete', path: string) {
  const bodies: unknown[] = []
  server.events.on('request:start', async ({ request }) => {
    if (request.method.toLowerCase() === method && new URL(request.url).pathname.endsWith(path))
      bodies.push(
        await request
          .clone()
          .json()
          .catch(() => null),
      )
  })
  return bodies
}

describe('Osoby, family-warsaw (host)', () => {
  it('lists the family with accounts first and marks what the host changed', async () => {
    openPeople()
    const list = await screen.findByRole('list', { name: m.people_list_label() })
    const names = within(list)
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '')
    expect(names).toHaveLength(5)
    // Roles come from the members endpoint: host, co-host, member, then people without an account.
    expect(
      ['Ola', 'Marek', 'Babcia', 'Zosia'].map((n) => names.findIndex((t) => t.includes(n))),
    ).toEqual([0, 1, 2, 3])
    const grandma = await personItem('Babcia Halina')
    expect(
      within(grandma).getByText(
        m.people_source_changed({
          fields: [m.people_walk_label()].join(', ').toLowerCase(),
        }),
      ),
    ).toBeTruthy()
    const girl = await personItem('Zosia')
    expect(within(girl).getByText(m.people_source_default())).toBeTruthy()
  })

  it('adds a person: POST with name and age, then the list shows them', async () => {
    openPeople()
    const bodies = recordBodies('post', '/profiles')
    const [add] = await screen.findAllByRole('button', { name: m.people_add() })
    if (!add) throw new Error('no add button')
    await userEvent.click(add)
    await userEvent.type(screen.getByLabelText(m.people_form_name_label()), 'Kasia')
    await userEvent.type(screen.getByLabelText(m.people_form_age_label()), '6')
    await userEvent.click(screen.getByRole('button', { name: m.people_form_add_submit() }))

    // The people list; the voting tools below it name the new person too.
    const peopleList = await screen.findByRole('list', { name: m.people_list_label() })
    expect(await within(peopleList).findByText('Kasia')).toBeTruthy()
    expect(bodies).toEqual([{ display_name: 'Kasia', age: 6 }])
  })

  it('edits comfort values: PATCH has only the changed field and the chip names it', async () => {
    openPeople()
    const bodies = recordBodies('patch', `/profiles/${PROFILE_IDS.zosia}`)
    await userEvent.click(
      await screen.findByRole('button', { name: m.people_edit_label({ name: 'Zosia' }) }),
    )
    const daily = screen.getByLabelText(m.people_form_daily_label())
    await userEvent.clear(daily)
    await userEvent.type(daily, '6')
    await userEvent.click(screen.getByRole('button', { name: m.people_form_edit_submit() }))

    await waitFor(() => expect(bodies).toEqual([{ daily_km: 6 }]))
    const girl = await personItem('Zosia')
    await waitFor(() =>
      expect(
        within(girl).queryByText(
          m.people_source_changed({ fields: m.people_walk_label().toLowerCase() }),
        ),
      ).toBeTruthy(),
    )
  })

  it('removes a person without an account after a confirmation', async () => {
    openPeople()
    await userEvent.click(
      await screen.findByRole('button', { name: m.people_edit_label({ name: 'Antek' }) }),
    )
    await userEvent.click(screen.getByRole('button', { name: m.people_delete() }))
    await userEvent.click(screen.getByRole('button', { name: m.people_delete_yes() }))

    await waitFor(() => expect(screen.queryByText('Antek')).toBeNull())
    const peopleList = screen.getByRole('list', { name: m.people_list_label() })
    expect(within(peopleList).getByText('Zosia')).toBeTruthy()
  })

  it('keeps the dialog open and explains a 409 when the person has gained an account', async () => {
    server.use(
      http.delete(PROFILE, () =>
        HttpResponse.json({ detail: 'Profile belongs to an account' }, { status: 409 }),
      ),
    )
    openPeople()
    await userEvent.click(
      await screen.findByRole('button', { name: m.people_edit_label({ name: 'Zosia' }) }),
    )
    await userEvent.click(screen.getByRole('button', { name: m.people_delete() }))
    await userEvent.click(screen.getByRole('button', { name: m.people_delete_yes() }))

    expect(await screen.findByText(m.people_error_has_account())).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('offers no edit button for people with an account', async () => {
    openPeople()
    const mother = await personItem('Ola')
    expect(
      within(mother).queryByRole('button', { name: m.people_edit_label({ name: 'Ola' }) }),
    ).toBeNull()
  })
})

describe('Osoby, member-readonly', () => {
  it('gives a member the list without add or edit buttons', async () => {
    useScenario('member-readonly')
    openPeople()
    const list = await screen.findByRole('list', { name: m.people_list_label() })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('button', { name: m.people_add() })).toBeNull()
    expect(
      within(list).queryByRole('button', { name: m.people_edit_label({ name: 'Zosia' }) }),
    ).toBeNull()
  })

  it('shows the no-permission message when a write is refused (403)', async () => {
    // A co-host sees the add button; the API still refuses the write.
    useScenario('member-readonly', {
      tweak: (world) => {
        for (const trip of world.trips) trip.my_role = 'co_host'
      },
    })
    server.use(http.post(PROFILES, () => HttpResponse.json({ detail: 'no' }, { status: 403 })))
    openPeople()
    const [add] = await screen.findAllByRole('button', { name: m.people_add() })
    if (!add) throw new Error('no add button')
    await userEvent.click(add)
    await userEvent.type(screen.getByLabelText(m.people_form_name_label()), 'Kasia')
    await userEvent.type(screen.getByLabelText(m.people_form_age_label()), '6')
    await userEvent.click(screen.getByRole('button', { name: m.people_form_add_submit() }))

    expect(await screen.findByText(m.people_error_forbidden())).toBeTruthy()
  })
})

describe('Osoby, broken servers', () => {
  it('shows the load error with a retry on a server error', async () => {
    server.use(http.get(PROFILES, () => HttpResponse.json({}, { status: 500 })))
    openPeople()
    expect(await screen.findByText(m.people_load_failed_title())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
  })
})
