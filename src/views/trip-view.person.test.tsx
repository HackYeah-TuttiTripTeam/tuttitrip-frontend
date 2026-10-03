// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { PROFILE_IDS, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const PREFERENCES = '*/api/v1/trips/:tripId/profiles/:profileId/preferences'

const openPerson = (profileId: string) =>
  renderApp(`/trips/${TRIP_ID}?tab=people&person=${profileId}`)

/** Records the JSON bodies of the requests to a path, in order. */
function recordBodies(method: 'put' | 'patch', pathEnd: string) {
  const bodies: Record<string, unknown>[] = []
  server.events.on('request:start', async ({ request }) => {
    if (request.method.toLowerCase() === method && new URL(request.url).pathname.endsWith(pathEnd))
      bodies.push(await request.clone().json())
  })
  return bodies
}

const heading = (name: string) => screen.findByRole('heading', { name, level: 2 })

describe('Preferencje osoby, host', () => {
  it('opens from the people list and goes back to it', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=people`)
    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: m.prefs_open_label({ name: 'Zosia' }) },
        // The first test of the file also loads the whole app.
        { timeout: 5000 },
      ),
    )
    expect(await heading('Zosia')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: m.prefs_back() }))
    expect(await screen.findByRole('list', { name: m.people_list_label() })).toBeTruthy()
  })

  it('shows a child with the nap and walking values from the age, marked as defaults, and lets the host change them', async () => {
    openPerson(PROFILE_IDS.zosia)
    await heading('Zosia')
    expect(
      (screen.getByLabelText(m.people_form_nap_minutes_label()) as HTMLInputElement).value,
    ).toBe('60')
    expect((screen.getByLabelText(m.people_form_daily_label()) as HTMLInputElement).value).toBe('4')
    expect(screen.getAllByText(m.people_source_default()).length).toBeGreaterThan(0)

    const bodies = recordBodies('patch', `/profiles/${PROFILE_IDS.zosia}`)
    const daily = screen.getByLabelText(m.people_form_daily_label())
    await userEvent.clear(daily)
    await userEvent.type(daily, '6')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_save() }))

    await waitFor(() => expect(bodies).toEqual([{ daily_km: 6 }]))
    expect(await screen.findByText(m.prefs_saved())).toBeTruthy()
    expect(await screen.findByText(m.prefs_source_manual())).toBeTruthy()
  })

  it('saves a ticked wheelchair of the grandmother, and it is still ticked after a reload', async () => {
    const view = openPerson(PROFILE_IDS.babcia)
    const bodies = recordBodies('put', '/preferences')
    await heading('Babcia Halina')
    const wheelchair = screen.getByRole('switch', { name: new RegExp(m.prefs_wheelchair()) })
    expect(wheelchair.getAttribute('aria-checked')).toBe('false')
    await userEvent.click(wheelchair)
    await userEvent.click(screen.getByRole('button', { name: m.prefs_save() }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]?.constraints).toMatchObject({ wheelchair: true, stairs: true, heat: true })
    // Everything saved before goes back too: the PUT replaces the whole preferences.
    expect(bodies[0]).toMatchObject({
      diet: { tags: ['lactose_free'], allergies: ['orzechy'] },
      interests: { parks: 1, music: 1 },
    })

    view.unmount()
    openPerson(PROFILE_IDS.babcia)
    await heading('Babcia Halina')
    const again = screen.getByRole('switch', { name: new RegExp(m.prefs_wheelchair()) })
    expect(again.getAttribute('aria-checked')).toBe('true')
  })

  it('saves a diet chip at once, and an allergy typed by hand', async () => {
    openPerson(PROFILE_IDS.tata)
    const bodies = recordBodies('put', '/preferences')
    await heading('Marek')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_diet_gluten_free() }))
    await waitFor(() =>
      expect(bodies.at(-1)?.diet).toEqual({ tags: ['vegetarian', 'gluten_free'], allergies: [] }),
    )
    await userEvent.type(screen.getByPlaceholderText(m.prefs_allergy_placeholder()), 'seler{Enter}')
    await waitFor(() =>
      expect(bodies.at(-1)?.diet).toEqual({
        tags: ['vegetarian', 'gluten_free'],
        allergies: ['seler'],
      }),
    )
    expect(
      await screen.findByRole('button', { name: m.prefs_allergy_remove({ name: 'seler' }) }),
    ).toBeTruthy()
  })

  it('ticks interests and keeps the strength of the ones already there', async () => {
    openPerson(PROFILE_IDS.mama)
    const bodies = recordBodies('put', '/preferences')
    await heading('Ola')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_interest_art() }))
    await userEvent.click(screen.getByRole('button', { name: m.prefs_interest_history() }))
    await waitFor(() => expect(bodies).toHaveLength(2))
    expect(bodies[0]?.interests).toEqual({ history: 1, museums: 1, local_food: 1, art: 1 })
    expect(bodies[1]?.interests).toEqual({ museums: 1, local_food: 1, art: 1 })
  })

  it('puts the old diet back and says so in Polish when the save fails', async () => {
    useScenario('preferences-save-error')
    openPerson(PROFILE_IDS.tata)
    await heading('Marek')
    const vegan = screen.getByRole('button', { name: m.prefs_diet_vegan() })
    expect(vegan.getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(vegan)

    expect(await screen.findByText(m.people_error_generic())).toBeTruthy()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: m.prefs_diet_vegan() }).getAttribute('aria-pressed'),
      ).toBe('false'),
    )
    expect(
      screen.getByRole('button', { name: m.prefs_diet_vegetarian() }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('explains a refused save (403)', async () => {
    openPerson(PROFILE_IDS.tata)
    server.use(http.put(PREFERENCES, () => HttpResponse.json({ detail: 'no' }, { status: 403 })))
    await heading('Marek')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_diet_halal() }))
    expect(await screen.findByText(m.prefs_error_forbidden())).toBeTruthy()
  })

  it('says so when the person is not on the trip', async () => {
    openPerson('11111111-1111-4111-8111-111111111111')
    expect(await screen.findByText(m.prefs_person_missing_title())).toBeTruthy()
  })

  it('offers a retry when the preferences do not load', async () => {
    server.use(http.get(PREFERENCES, () => HttpResponse.json({}, { status: 500 })))
    openPerson(PROFILE_IDS.tata)
    expect(await screen.findByText(m.prefs_load_failed_title())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
  })
})

describe('Preferencje osoby, member-readonly', () => {
  it('lets a member edit their own profile', async () => {
    useScenario('member-readonly')
    openPerson(PROFILE_IDS.mama)
    await heading('Ola')
    expect(screen.queryByRole('note')).toBeNull()
    expect(screen.getByRole('button', { name: m.prefs_save() })).toBeTruthy()
    expect(screen.getByRole('button', { name: m.prefs_interest_art() })).toBeTruthy()
  })

  it("shows another person's profile read only, without their constraints", async () => {
    useScenario('member-readonly')
    openPerson(PROFILE_IDS.babcia)
    await heading('Babcia Halina')
    expect(screen.getByRole('note').textContent).toBe(m.prefs_readonly_note())
    expect(screen.getByText(m.prefs_constraints_hidden())).toBeTruthy()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.queryByRole('button', { name: m.prefs_save() })).toBeNull()
    expect(screen.queryByRole('button', { name: m.prefs_diet_halal() })).toBeNull()
    // What they ticked is listed, nothing else.
    const interests = screen.getByRole('list', { name: m.prefs_interests_title() })
    expect(
      within(interests)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([m.prefs_interest_music(), m.prefs_interest_parks()])
  })
})
