// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DESKTOP_QUERY } from '@/hooks/use-media-query'
import { PROFILE_IDS, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The first render in a file pays for the cold module graph; a loaded CI box needs more than 1 s.
const SLOW = { timeout: 8000 }
// Each test renders the whole trip page, the slowest screen; a loaded box needs more than 5 s.
vi.setConfig({ testTimeout: 30_000 })

const PLAN_URL = `/trips/${TRIP_ID}?tab=plan`

const phone = window.matchMedia

/** The plan tab as a desktop sees it: the fairness panel sits beside the plan. */
function asDesktop() {
  window.matchMedia = (query: string) =>
    ({
      matches: query === DESKTOP_QUERY,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
}

beforeEach(asDesktop)
afterEach(() => {
  window.matchMedia = phone
})

/** Records the JSON bodies of the requests with a method to a path, in order. */
function recordBodies(method: string, pathEnd: string) {
  const bodies: unknown[] = []
  server.events.on('request:start', async ({ request }) => {
    if (request.method === method && new URL(request.url).pathname.endsWith(pathEnd))
      bodies.push(await request.clone().json())
  })
  return bodies
}

const panel = async () => within(await screen.findByRole('complementary', {}, SLOW))

describe('Fairness panel, group', () => {
  it('shows a bar per person with "x% of your maximum", min r and the Jain index', async () => {
    renderApp(PLAN_URL)
    const view = await panel()
    expect(await view.findByRole('heading', { name: m.fairness_title() })).toBeTruthy()
    // Ola is the signed-in person, so her bar speaks of "your maximum"; the others' of their own.
    expect(view.getByText(m.fairness_of_yours({ pct: 86 }))).toBeTruthy()
    expect(view.getByText(m.fairness_of_theirs({ pct: 85 }))).toBeTruthy()
    expect(view.getByText(m.fairness_min_r())).toBeTruthy()
    expect(view.getByText(m.fairness_jain())).toBeTruthy()
    expect(view.getByText(m.fairness_least({ name: 'Marek', pct: 85 }))).toBeTruthy()
    // The floor is named in words, not only drawn.
    expect(view.getAllByText(m.fairness_floor_met({ floor: 40 })).length).toBe(5)
  })

  it('lists no warnings when every guarantee is kept', async () => {
    renderApp(PLAN_URL)
    expect(await (await panel()).findByText(m.warning_none())).toBeTruthy()
  })

  it('shows the missed guarantees and conflicts with the person and the reason', async () => {
    useScenario('floors-missed')
    renderApp(PLAN_URL)
    const view = await panel()
    expect(
      await view.findByText(m.warning_floor({ name: 'Babcia Halina', shortfall: 6 })),
    ).toBeTruthy()
    expect(view.getByText(m.warning_own_place_day({ name: 'Antek', day: 2 }))).toBeTruthy()
    expect(view.getByText(m.warning_conflict_floor({ people: 'Babcia Halina' }))).toBeTruthy()
    expect(view.getByText(m.warning_conflict_price())).toBeTruthy()
    expect(view.getByText(m.warning_violation({ value: '0,35' }))).toBeTruthy()
  })

  it('opens the ledger of the host and the domains of one person', async () => {
    renderApp(PLAN_URL)
    const view = await panel()
    const ledger = await view.findByRole('table')
    expect(within(ledger).getByText('Babcia Halina')).toBeTruthy()
    await userEvent.click(view.getByRole('button', { name: m.ledger_toggle({ name: 'Antek' }) }))
    expect(view.getAllByText(m.fairness_weakest()).length).toBeGreaterThan(0)
  })

  it('shows the same panel in a drawer on a phone', async () => {
    window.matchMedia = phone
    renderApp(PLAN_URL)
    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(m.fairness_aside_label()) }, SLOW),
    )
    expect(await screen.findByRole('heading', { name: m.fairness_title() })).toBeTruthy()
  })
})

describe('Fairness panel, one person', () => {
  it('shows the five domains and the weakest one instead of Jain, and no weights or slider', async () => {
    useScenario('solo')
    renderApp(PLAN_URL)
    const view = await panel()
    expect(await view.findByRole('heading', { name: m.fairness_title_solo() })).toBeTruthy()
    expect(
      view.getByText(m.fairness_solo_weakest({ domain: m.prefs_pool_domain_cost(), score: 72 })),
    ).toBeTruthy()
    expect(view.queryByText(m.fairness_jain())).toBeNull()
    expect(view.queryByText(m.weights_title())).toBeNull()
    expect(view.queryByText(m.alpha_title())).toBeNull()
    expect(view.queryByRole('table')).not.toBeNull()
  })
})

describe('Weights', () => {
  it('saves a preset once, recalculates and shows what moved', async () => {
    const weights = recordBodies('PUT', '/profiles/weights')
    const plans = recordBodies('POST', '/plans')
    renderApp(PLAN_URL)
    const view = await panel()
    const kids = await view.findByRole('radio', { name: m.weights_preset_children() })
    expect(kids.getAttribute('aria-checked')).toBe('false')
    expect(
      view.getByRole('radio', { name: m.weights_preset_equal() }).getAttribute('aria-checked'),
    ).toBe('true')

    await userEvent.click(kids)

    await waitFor(() => expect(weights).toEqual([{ preset: 'pod_dzieci' }]))
    expect(await screen.findByText(m.plan_version({ n: 2 }), {}, SLOW)).toBeTruthy()
    expect(plans).toHaveLength(1)
    // Children count double: their bars rise, the adults' fall, and the panel says by how much.
    expect(view.getByText(m.fairness_plan_changed({ cost: '0 zł', time: '0 min' }))).toBeTruthy()
    expect(
      view.getByRole('radio', { name: m.weights_preset_children() }).getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('asks whose day it is for "Dzień babci" and sends the person', async () => {
    const weights = recordBodies('PUT', '/profiles/weights')
    renderApp(PLAN_URL)
    const view = await panel()
    await userEvent.click(await view.findByRole('radio', { name: m.weights_preset_grandma() }))
    await waitFor(() =>
      expect(weights).toEqual([{ preset: 'dzien_babci', focus_profile_id: PROFILE_IDS.babcia }]),
    )
    const focus = await view.findByRole('radio', { name: 'Zosia' })
    await userEvent.click(focus)
    await waitFor(() => expect(weights).toHaveLength(2))
    expect(weights[1]).toEqual({ preset: 'dzien_babci', focus_profile_id: PROFILE_IDS.zosia })
  })

  it('sends one write per release of a person slider', async () => {
    const weights = recordBodies('PUT', '/profiles/weights')
    renderApp(PLAN_URL)
    const view = await panel()
    const thumb = await view.findByRole('slider', {
      name: m.weights_person_label({ name: 'Zosia' }),
    })
    thumb.focus()
    fireEvent.keyDown(thumb, { key: 'End' })
    await waitFor(() =>
      expect(weights).toEqual([{ weights: [{ profile_id: PROFILE_IDS.zosia, weight: 3 }] }]),
    )
  })

  it('shows the weights read-only to a member', async () => {
    useScenario('member-readonly')
    renderApp(PLAN_URL)
    const view = await panel()
    expect(await view.findByText(m.weights_title())).toBeTruthy()
    // Only the group goal slider is left, and it cannot be moved.
    expect(view.getAllByRole('slider')).toHaveLength(1)
    expect(view.getByRole('slider').hasAttribute('data-disabled')).toBe(true)
    expect(view.getAllByText(m.weights_value({ value: '1' })).length).toBe(5)
    expect(
      view.getByRole('radio', { name: m.weights_preset_children() }).hasAttribute('disabled') ||
        view
          .getByRole('radio', { name: m.weights_preset_children() })
          .getAttribute('data-disabled') !== null,
    ).toBe(true)
    expect(view.queryByRole('table')).toBeNull()
  })
})

describe('Fairness slider', () => {
  it('has the range, both ends and the default marked, and saves on release', async () => {
    const trips = recordBodies('PATCH', `/trips/${TRIP_ID}`)
    renderApp(PLAN_URL)
    const view = await panel()
    const thumb = await view.findByRole('slider', { name: m.alpha_title() })
    expect(thumb.getAttribute('aria-valuemin')).toBe('0')
    expect(thumb.getAttribute('aria-valuemax')).toBe('3')
    expect(thumb.getAttribute('aria-valuetext')).toBe(m.alpha_value_default({ value: '1' }))
    expect(view.getByText(m.alpha_end_utility())).toBeTruthy()
    expect(view.getByText(m.alpha_end_equality())).toBeTruthy()

    thumb.focus()
    fireEvent.keyDown(thumb, { key: 'End' })

    await waitFor(() => expect(trips).toEqual([{ fairness_alpha: 3 }]))
    expect(await screen.findByText(m.plan_version({ n: 2 }), {}, SLOW)).toBeTruthy()
    // More equality lifts the least satisfied person.
    expect(await view.findAllByText(/pkt$/)).not.toHaveLength(0)
  })

  it('says "plan unchanged" when the slider did not move the plan', async () => {
    renderApp(PLAN_URL)
    const view = await panel()
    const thumb = await view.findByRole('slider', { name: m.alpha_title() })
    thumb.focus()
    fireEvent.keyDown(thumb, { key: 'Home' })
    expect(await view.findByText(m.alpha_unchanged(), {}, SLOW)).toBeTruthy()
    expect(view.getByText(m.fairness_plan_unchanged())).toBeTruthy()
  })

  it('is read-only for a member', async () => {
    useScenario('member-readonly')
    renderApp(PLAN_URL)
    const view = await panel()
    expect(await view.findByText(m.alpha_read_only())).toBeTruthy()
  })
})

describe('Rating and veto on a stop', () => {
  const stop = (name: string) =>
    within(screen.getByRole('heading', { name, level: 3 }).closest('li') as HTMLElement)

  it('opens the six reasons after a thumb down and saves the rating with one touch', async () => {
    const puts = recordBodies('PUT', '/ratings/7c2e9a10-4d5b-4f61-8a3c-0000000000a1')
    renderApp(PLAN_URL)
    await screen.findByRole('heading', { name: 'Zamek Królewski', level: 3 }, SLOW)
    const zamek = stop('Zamek Królewski')
    await userEvent.click(
      zamek.getByRole('button', { name: m.rating_dont_want({ name: 'Zamek Królewski' }) }),
    )
    expect(zamek.getAllByRole('radio')).toHaveLength(6)
    await userEvent.click(zamek.getByRole('radio', { name: m.reason_too_expensive() }))
    await waitFor(() =>
      expect(puts).toEqual([{ value: 'dont_want', reason_code: 'too_expensive' }]),
    )
    expect(
      zamek
        .getByRole('button', { name: m.rating_dont_want({ name: 'Zamek Królewski' }) })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('saves a thumb up and takes it back', async () => {
    const puts = recordBodies('PUT', '/ratings/7c2e9a10-4d5b-4f61-8a3c-0000000000a1')
    renderApp(PLAN_URL)
    await screen.findByRole('heading', { name: 'Zamek Królewski', level: 3 }, SLOW)
    const up = () =>
      stop('Zamek Królewski').getByRole('button', {
        name: m.rating_want({ name: 'Zamek Królewski' }),
      })
    await userEvent.click(up())
    await waitFor(() => expect(up().getAttribute('aria-pressed')).toBe('true'))
    await userEvent.click(up())
    await waitFor(() => expect(puts).toEqual([{ value: 'want' }, { value: 'neutral' }]))
  })

  it('lets the host veto in the name of another person: saved with the author, plan recalculated, place gone', async () => {
    const vetoes = recordBodies('POST', '/vetoes')
    renderApp(PLAN_URL)
    await screen.findByRole('heading', { name: 'Zamek Królewski', level: 3 }, SLOW)
    await userEvent.click(
      screen.getByRole('button', { name: m.veto_open({ name: 'Zamek Królewski' }) }),
    )
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Zosia' }))
    await userEvent.click(within(dialog).getByRole('button', { name: m.veto_confirm() }))

    await waitFor(() =>
      expect(vetoes).toEqual([
        { profile_id: PROFILE_IDS.zosia, place_id: '7c2e9a10-4d5b-4f61-8a3c-0000000000a1' },
      ]),
    )
    await waitFor(
      () => expect(screen.queryByRole('heading', { name: 'Zamek Królewski', level: 3 })).toBeNull(),
      SLOW,
    )
    expect(screen.getByText(m.plan_version({ n: 2 }))).toBeTruthy()
    // The panel compares with the version before: the plan is cheaper by one veto.
    expect(within(screen.getByRole('complementary')).getByText(/−90/)).toBeTruthy()
  })

  it('keeps the veto and says the plan was not recalculated, with a retry', async () => {
    useScenario('recompute-error')
    renderApp(PLAN_URL)
    await screen.findByRole('heading', { name: 'Zamek Królewski', level: 3 }, SLOW)
    await userEvent.click(
      screen.getByRole('button', { name: m.veto_open({ name: 'Zamek Królewski' }) }),
    )
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: m.veto_confirm() }),
    )

    expect(await screen.findByText(m.veto_not_recalculated(), {}, SLOW)).toBeTruthy()
    // The old plan stays, and the vetoed stop says who vetoed it.
    expect(screen.getByRole('heading', { name: 'Zamek Królewski', level: 3 })).toBeTruthy()
    expect(await screen.findByText(m.veto_note({ name: 'Ola' }))).toBeTruthy()
    expect(screen.getByRole('button', { name: m.veto_retry() })).toBeTruthy()
  })

  it('shows "veto: name, filed by the host" on a stop vetoed for somebody else', async () => {
    useScenario('recompute-error')
    renderApp(PLAN_URL)
    await screen.findByRole('heading', { name: 'Zamek Królewski', level: 3 }, SLOW)
    await userEvent.click(
      screen.getByRole('button', { name: m.veto_open({ name: 'Zamek Królewski' }) }),
    )
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Zosia' }))
    await userEvent.click(within(dialog).getByRole('button', { name: m.veto_confirm() }))
    expect(await screen.findByText(m.veto_note_on_behalf({ name: 'Zosia' }), {}, SLOW)).toBeTruthy()
  })
})

describe('Cost per person', () => {
  it('shows the price of each person with the discount and the sum', async () => {
    renderApp(PLAN_URL)
    await screen.findByRole('heading', { name: 'Zamek Królewski', level: 3 }, SLOW)
    const zamek = within(
      screen
        .getByRole('heading', { name: 'Zamek Królewski', level: 3 })
        .closest('li') as HTMLElement,
    )
    await userEvent.click(zamek.getByText(m.cost_open({ name: 'Zamek Królewski' })))
    const babcia = zamek.getByText(/Babcia Halina/)
    expect(babcia.textContent).toContain(m.cost_discount_senior())
    expect(zamek.getByText(m.cost_discount_child(), { exact: false })).toBeTruthy()
    expect(zamek.getByText(m.cost_sum()).parentElement?.textContent).toContain('90')
  })

  it('shows the day total in the day header and the transport ticket as information', async () => {
    renderApp(PLAN_URL)
    expect(await screen.findByText(m.cost_day({ amount: '190,63 zł' }), {}, SLOW)).toBeTruthy()
    expect(
      screen.getByText(m.cost_transit({ ticket: m.cost_ticket_day(), amount: '15 zł' })),
    ).toBeTruthy()
  })

  it('shows what a family ticket saves, on the second day', async () => {
    renderApp(PLAN_URL)
    await screen.findByRole('heading', { name: 'Zamek Królewski', level: 3 }, SLOW)
    await userEvent.click(screen.getByRole('tab', { name: m.plan_day_n({ n: 2 }) }))
    expect(await screen.findByText(m.cost_family_saving({ amount: '40 zł' }))).toBeTruthy()
    expect(screen.getByText(m.cost_day({ amount: '100 zł' }))).toBeTruthy()
  })

  it('marks an unverified price, names the surcharge and links the source', async () => {
    renderApp(PLAN_URL)
    await screen.findByRole('heading', { name: 'Bar Mleczny Prasowy', level: 3 }, SLOW)
    const bar = within(
      screen
        .getByRole('heading', { name: 'Bar Mleczny Prasowy', level: 3 })
        .closest('li') as HTMLElement,
    )
    await userEvent.click(bar.getByText(m.cost_open({ name: 'Bar Mleczny Prasowy' })))
    expect(bar.getAllByText(m.plan_price_unverified()).length).toBeGreaterThan(0)
    expect(bar.getByText(m.cost_surcharge_note())).toBeTruthy()
    expect(bar.getAllByRole('link').length).toBeGreaterThan(0)
  })
})
