// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { CATALOG_PLACE_IDS, PROFILE_IDS, TRIP_ID } from '@/mocks/fixtures'
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

  it('does not save a failed tap together with the next one', async () => {
    openPerson(PROFILE_IDS.tata)
    let puts = 0
    const bodies = recordBodies('put', '/preferences')
    server.use(
      http.put(PREFERENCES, async () => {
        puts += 1
        if (puts > 1) return undefined // the scenario's own handler saves it
        // Slow enough that the second tap happens before this one fails.
        await delay(600)
        return HttpResponse.json({ detail: 'boom' }, { status: 500 })
      }),
    )
    await heading('Marek')
    // Two taps before the first save has answered.
    await userEvent.click(screen.getByRole('button', { name: m.prefs_diet_vegan() }))
    await userEvent.click(screen.getByRole('button', { name: m.prefs_diet_halal() }))

    expect(await screen.findByText(m.people_error_generic())).toBeTruthy()
    await waitFor(() => expect(puts).toBe(2))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: m.prefs_diet_vegan() }).getAttribute('aria-pressed'),
      ).toBe('false')
      expect(
        screen.getByRole('button', { name: m.prefs_diet_halal() }).getAttribute('aria-pressed'),
      ).toBe('true')
    })
    // What reached the server: the second tap alone, without the failed first one.
    expect(bodies[1]?.diet).toEqual({ tags: ['vegetarian', 'halal'], allergies: [] })
    // The message of the first tap is still there after the second one succeeded.
    expect(screen.getByText(m.people_error_generic())).toBeTruthy()
  })

  it('saves the constraints first, and says so when the walking values then fail', async () => {
    openPerson(PROFILE_IDS.zosia)
    const puts = recordBodies('put', '/preferences')
    server.use(
      http.patch(`*/api/v1/trips/:tripId/profiles/:profileId`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    await heading('Zosia')
    await userEvent.click(screen.getByRole('switch', { name: new RegExp(m.prefs_stairs()) }))
    const daily = screen.getByLabelText(m.people_form_daily_label())
    await userEvent.clear(daily)
    await userEvent.type(daily, '6')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_save() }))

    expect(await screen.findByText(new RegExp(m.prefs_error_partial()))).toBeTruthy()
    expect(puts[0]?.constraints).toMatchObject({ stairs: true })
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

const spin = (name: string) => screen.findByRole('spinbutton', { name })

describe('Pula ważności', () => {
  it('names each domain with its points for a screen reader and moves by arrow keys', async () => {
    openPerson(PROFILE_IDS.zosia)
    await heading('Zosia')
    const food = await spin(m.prefs_pool_domain_food())
    expect(food.getAttribute('aria-valuenow')).toBe('2')
    expect(food.getAttribute('aria-valuemin')).toBe('0')
    expect(food.getAttribute('aria-valuetext')).toBe(
      m.prefs_pool_value({ domain: m.prefs_pool_domain_food(), points: 2, total: 10 }),
    )
    expect(within(screen.getByRole('main')).getByRole('status').textContent).toBe(
      m.prefs_pool_complete(),
    )

    food.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(food.getAttribute('aria-valuenow')).toBe('1')
    expect(within(screen.getByRole('main')).getByRole('status').textContent).toBe(
      m.prefs_pool_remaining({ count: 1 }),
    )
    expect(screen.getByText(m.prefs_pool_need_all())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.prefs_pool_save() }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('never lets the pool go over 10 dots', async () => {
    openPerson(PROFILE_IDS.zosia)
    await heading('Zosia')
    const pace = await spin(m.prefs_pool_domain_pace())
    pace.focus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{End}')
    expect(pace.getAttribute('aria-valuenow')).toBe('2')
    const more = screen.getByRole('button', {
      name: m.prefs_pool_more({ domain: m.prefs_pool_domain_pace() }),
    })
    expect(more.hasAttribute('disabled')).toBe(true)
    // Free points can be given out up to the total, and only then.
    await userEvent.keyboard('{Home}')
    expect(pace.getAttribute('aria-valuenow')).toBe('0')
    await userEvent.keyboard('{End}')
    expect(pace.getAttribute('aria-valuenow')).toBe('2')
  })

  it('shows the automatic minimum from 4 points, only where the person has a minimum tag', async () => {
    openPerson(PROFILE_IDS.mama)
    await heading('Ola')
    const min = (count: number) => m.prefs_pool_min({ count })
    expect(screen.queryByText(min(1))).toBeNull()
    for (const domain of [m.prefs_pool_domain_lodging(), m.prefs_pool_domain_pace()]) {
      ;(await spin(domain)).focus()
      await userEvent.keyboard('{Home}')
    }
    const attractions = await spin(m.prefs_pool_domain_attractions())
    attractions.focus()
    await userEvent.keyboard('{End}') // 6 points: 1 place
    const note = screen.getByText(min(1))
    expect(attractions.getAttribute('aria-describedby')).toBe(note.id)
    await userEvent.keyboard('{Home}')
    ;(await spin(m.prefs_pool_domain_food())).focus()
    await userEvent.keyboard('{End}') // 8 points: 2 places
    expect(screen.getByText(min(2))).toBeTruthy()
    // Pace has 0 points and no tag; lodging never carries a minimum.
    expect(screen.getAllByText(/miejsc na tag|places per tag/)).toHaveLength(1)
  })

  it('shows no minimum for a person without minimum tags', async () => {
    openPerson(PROFILE_IDS.zosia)
    await heading('Zosia')
    ;(await spin(m.prefs_pool_domain_lodging())).focus()
    await userEvent.keyboard('{Home}')
    ;(await spin(m.prefs_pool_domain_attractions())).focus()
    await userEvent.keyboard('{End}')
    expect(screen.queryByText(m.prefs_pool_min({ count: 1 }))).toBeNull()
  })

  it('saves a full pool as the whole body, only the pool changed', async () => {
    openPerson(PROFILE_IDS.mama)
    const bodies = recordBodies('put', '/preferences')
    await heading('Ola')
    ;(await spin(m.prefs_pool_domain_cost())).focus()
    await userEvent.keyboard('{ArrowDown}')
    ;(await spin(m.prefs_pool_domain_food())).focus()
    await userEvent.keyboard('{ArrowUp}')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_pool_save() }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({
      importance_pool: { lodging: 2, food: 3, attractions: 2, pace: 2, cost: 1 },
      interests: { history: 1, museums: 1, local_food: 1 },
    })
    expect(await screen.findByText(m.prefs_pool_complete())).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.prefs_pool_save() })).toBeNull()
    // The save button is gone; focus stays on the row that was edited last.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('spinbutton', { name: m.prefs_pool_domain_food() }),
      ),
    )
  })

  it('leaves the pool out of other saves until someone saved it, so the age default keeps following', async () => {
    openPerson(PROFILE_IDS.zosia)
    const bodies = recordBodies('put', '/preferences')
    await heading('Zosia')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_interest_kids() }))
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).not.toHaveProperty('importance_pool')
  })

  it('says why a pool was not saved, and the saved values come back with "undo"', async () => {
    useScenario('preferences-save-error')
    openPerson(PROFILE_IDS.mama)
    await heading('Ola')
    const attractions = await spin(m.prefs_pool_domain_attractions())
    attractions.focus()
    await userEvent.keyboard('{ArrowDown}')
    ;(await spin(m.prefs_pool_domain_food())).focus()
    await userEvent.keyboard('{ArrowUp}')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_pool_save() }))

    expect(await screen.findByText(m.people_error_generic())).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: m.prefs_pool_reset() }))
    expect((await spin(m.prefs_pool_domain_attractions())).getAttribute('aria-valuenow')).toBe('2')
    expect((await spin(m.prefs_pool_domain_food())).getAttribute('aria-valuenow')).toBe('2')
    expect(screen.queryByText(m.people_error_generic())).toBeNull()
  })

  it('says the parent sets the points for a child', async () => {
    openPerson(PROFILE_IDS.zosia)
    await heading('Zosia')
    expect(await screen.findByText(new RegExp(m.prefs_pool_child()))).toBeTruthy()
  })
})

describe('Lubiane i nielubiane miejsca', () => {
  it('rates a catalog place as disliked on its own endpoint, and it is still there after a reload', async () => {
    const view = openPerson(PROFILE_IDS.mama)
    const ratings = recordBodies('put', `/ratings/${CATALOG_PLACE_IDS.narodowe}`)
    const preferences = recordBodies('put', '/preferences')
    await heading('Ola')
    await userEvent.type(
      await screen.findByLabelText(m.prefs_places_name_label()),
      'Muzeum Narodowe',
    )
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_dislike() }))

    await waitFor(() => expect(ratings).toEqual([{ value: 'dont_want', reason_code: 'other' }]))
    const disliked = await screen.findByRole('list', { name: m.prefs_places_disliked() })
    expect(within(disliked).getByText('Muzeum Narodowe')).toBeTruthy()
    expect(preferences).toEqual([])

    view.unmount()
    openPerson(PROFILE_IDS.mama)
    await heading('Ola')
    const again = await screen.findByRole('list', { name: m.prefs_places_disliked() })
    expect(within(again).getByText('Muzeum Narodowe')).toBeTruthy()
  })

  it('offers catalog places while typing and rates the one picked', async () => {
    openPerson(PROFILE_IDS.mama)
    const ratings = recordBodies('put', `/ratings/${CATALOG_PLACE_IDS.lazienki}`)
    await heading('Ola')
    await userEvent.type(await screen.findByLabelText(m.prefs_places_name_label()), 'łazien')
    await userEvent.click(await screen.findByRole('button', { name: 'Łazienki Królewskie' }))
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_like() }))
    await waitFor(() => expect(ratings).toEqual([{ value: 'want' }]))
    const liked = await screen.findByRole('list', { name: m.prefs_places_liked() })
    expect(within(liked).getByText('Łazienki Królewskie')).toBeTruthy()
  })

  it('keeps a typed name with the preferences, and later saves do not echo the ratings back', async () => {
    openPerson(PROFILE_IDS.mama)
    const bodies = recordBodies('put', '/preferences')
    await heading('Ola')
    const input = await screen.findByLabelText(m.prefs_places_name_label())
    await userEvent.type(input, 'Bar Prasowy')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_like() }))
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]?.example_places).toEqual([{ name: 'Bar Prasowy', verdict: 'like' }])

    await userEvent.type(input, 'Muzeum Polin')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_dislike() }))
    await screen.findByText('Muzeum Polin')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_interest_art() }))
    await waitFor(() => expect(bodies).toHaveLength(2))
    // The rated Muzeum Polin is not in the body; the typed Bar Prasowy stays.
    expect(bodies[1]?.example_places).toEqual([{ name: 'Bar Prasowy', verdict: 'like' }])
  })

  it('removes a rating and a typed name', async () => {
    openPerson(PROFILE_IDS.mama)
    await heading('Ola')
    const input = await screen.findByLabelText(m.prefs_places_name_label())
    await userEvent.type(input, 'Zamek Królewski')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_like() }))
    await userEvent.type(input, 'Bar Prasowy')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_like() }))
    await userEvent.click(
      await screen.findByRole('button', {
        name: m.prefs_places_remove({ name: 'Zamek Królewski' }),
      }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: m.prefs_places_remove({ name: 'Bar Prasowy' }) }),
    )
    await waitFor(() => expect(screen.queryByText('Zamek Królewski')).toBeNull())
    await waitFor(() => expect(screen.queryByText('Bar Prasowy')).toBeNull())
  })

  it('takes a failed rating back off the list and says so', async () => {
    useScenario('preferences-save-error')
    openPerson(PROFILE_IDS.mama)
    await heading('Ola')
    await userEvent.type(
      await screen.findByLabelText(m.prefs_places_name_label()),
      'Muzeum Narodowe',
    )
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_dislike() }))

    expect(await screen.findByText(m.people_error_generic())).toBeTruthy()
    // Gone from the list, still typed in the field so the save can be retried.
    expect(screen.getAllByText(m.prefs_places_none())).toHaveLength(2)
    expect((screen.getByLabelText(m.prefs_places_name_label()) as HTMLInputElement).value).toBe(
      'Muzeum Narodowe',
    )
  })

  it('takes a failed typed name back off the list', async () => {
    useScenario('preferences-save-error')
    openPerson(PROFILE_IDS.mama)
    await heading('Ola')
    await userEvent.type(await screen.findByLabelText(m.prefs_places_name_label()), 'Bar Prasowy')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_like() }))
    expect(await screen.findByText(m.people_error_generic())).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Bar Prasowy')).toBeNull())
  })

  it('does not echo a failed first place into the next save', async () => {
    openPerson(PROFILE_IDS.tata)
    let puts = 0
    const bodies = recordBodies('put', '/preferences')
    server.use(
      http.put(PREFERENCES, async () => {
        puts += 1
        if (puts > 1) return undefined
        await delay(600)
        return HttpResponse.json({ detail: 'boom' }, { status: 500 })
      }),
    )
    await heading('Marek')
    const input = await screen.findByLabelText(m.prefs_places_name_label())
    await userEvent.type(input, 'Pierwsze')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_like() }))
    await userEvent.clear(input)
    await userEvent.type(input, 'Drugie')
    await userEvent.click(screen.getByRole('button', { name: m.prefs_places_add_like() }))
    await waitFor(() => expect(puts).toBe(2))
    expect(bodies[1]?.example_places).toEqual([{ name: 'Drugie', verdict: 'like' }])
    await waitFor(() => expect(screen.queryByText('Pierwsze')).toBeNull())
  })
})

describe('Pula i miejsca, member-readonly', () => {
  it("lists another person's pool and places without any control", async () => {
    useScenario('member-readonly')
    openPerson(PROFILE_IDS.babcia)
    await heading('Babcia Halina')
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByLabelText(m.prefs_places_name_label())).toBeNull()
    const pool = screen.getByRole('list', { name: m.prefs_pool_readonly_label() })
    expect(within(pool).getAllByRole('listitem')).toHaveLength(5)
    expect(
      within(pool).getByText(
        m.prefs_pool_value({ domain: m.prefs_pool_domain_food(), points: 2, total: 10 }),
      ),
    ).toBeTruthy()
  })
})
