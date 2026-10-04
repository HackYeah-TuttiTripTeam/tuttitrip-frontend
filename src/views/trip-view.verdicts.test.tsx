// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SKIPPED_PLACE_ID, TRIP_ID, VETOED_PLACE_ID } from '@/mocks/fixtures'
import { useScenario } from '@/mocks/node'
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

const openPlan = () => renderApp(`/trips/${TRIP_ID}?tab=plan`)
const dialog = () => screen.findByRole('dialog')

describe('place verdicts', () => {
  it('shows a chip with an icon and a word on every stop that has a verdict', async () => {
    openPlan()
    const chip = await screen.findByRole('button', { name: m.verdict_iconic_not_yours() })
    expect(chip.textContent).toBe(m.verdict_iconic_not_yours())
    expect(chip.querySelector('svg')).not.toBeNull()
    expect(screen.getAllByRole('button', { name: m.verdict_fits() }).length).toBeGreaterThan(0)
  })

  it('opens who is for, who is against, why and what instead', async () => {
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.verdict_iconic_not_yours() }))
    const sheet = await dialog()
    expect(within(sheet).getByRole('heading', { name: 'Zamek Królewski' })).toBeTruthy()
    const yes = within(sheet).getByRole('heading', { name: m.verdict_yes() }).parentElement
    expect(yes?.textContent).toContain('Ola')
    expect(yes?.textContent).toContain('Marek')
    const no = within(sheet).getByRole('heading', { name: m.verdict_no() }).parentElement
    expect(no?.textContent).toContain('Zosia')
    expect(no?.textContent).toContain(m.reason_not_my_vibe())
    expect(no?.textContent).toContain('Antek')
    expect(no?.textContent).toContain(m.reason_too_hard_for_child())
    // The numbers behind the verdict, per person.
    const table = within(sheet).getByRole('table')
    expect(within(table).getByText('0,82')).toBeTruthy()
    // The replacement, from the catalog.
    expect(within(sheet).getByRole('heading', { name: m.verdict_instead() })).toBeTruthy()
    expect(within(sheet).getByText('Muzeum Polin')).toBeTruthy()
  })

  it('offers to show a place that is in the plan, and not an empty "0" for no skip codes', async () => {
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.verdict_iconic_not_yours() }))
    const sheet = await dialog()
    expect(within(sheet).getByRole('button', { name: m.verdict_show_on_plan() })).toBeTruthy()
    expect(within(sheet).queryByText('0')).toBeNull()
  })

  it('hides the "instead" section when the API proposes nothing', async () => {
    const user = userEvent.setup()
    openPlan()
    const [fits] = await screen.findAllByRole('button', { name: m.verdict_fits() })
    if (!fits) throw new Error('no chip')
    await user.click(fits)
    const sheet = await dialog()
    expect(within(sheet).queryByRole('heading', { name: m.verdict_instead() })).toBeNull()
  })

  it('says nobody has rated the place yet and shows no empty "for" and "against" lists', async () => {
    const user = userEvent.setup()
    openPlan()
    // The science centre (day 2) has no votes yet.
    await user.click(await screen.findByRole('tab', { name: m.plan_day_n({ n: 2 }) }))
    await screen.findByText('Centrum Nauki Kopernik')
    await user.click(await screen.findByRole('button', { name: m.verdict_fits() }))
    const sheet = await dialog()
    expect(within(sheet).getByText(m.verdict_no_votes())).toBeTruthy()
    expect(within(sheet).queryByRole('heading', { name: m.verdict_yes() })).toBeNull()
  })

  it('lists the places the plan left out and explains one', async () => {
    const user = userEvent.setup()
    openPlan()
    expect(await screen.findByRole('heading', { name: m.verdict_skipped_title() })).toBeTruthy()
    expect(await screen.findByText('Muzeum Narodowe')).toBeTruthy()
    const chips = screen.getAllByRole('button', { name: m.verdict_skip() })
    await user.click(chips[0] as HTMLElement)
    const sheet = await dialog()
    expect(within(sheet).getByText(m.skip_stairs())).toBeTruthy()
  })

  it('closes the sheet with its close button', async () => {
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.verdict_iconic_not_yours() }))
    const sheet = await dialog()
    await user.click(within(sheet).getByRole('button', { name: m.dialog_close() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('host override', () => {
  it('shows the cost of forcing a place before it is confirmed, then plans it in and logs it', async () => {
    const user = userEvent.setup()
    openPlan()
    await screen.findByRole('heading', { name: m.verdict_skipped_title() })
    await user.click(screen.getAllByRole('button', { name: m.verdict_skip() })[0] as HTMLElement)
    await user.click(await screen.findByRole('button', { name: m.verdict_force() }))

    const override = await dialog()
    expect((await within(override).findAllByText('−0,04')).length).toBeGreaterThan(0)
    expect(within(override).getByText(/\+120\szł/)).toBeTruthy()
    expect(within(override).getByText(/\+25\smin/)).toBeTruthy()

    await user.type(within(override).getByLabelText(m.override_reason_label()), 'Babcia chce')
    await user.click(within(override).getByRole('button', { name: m.override_confirm() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // The place is in the plan now, as a "must" ...
    expect(await screen.findByRole('button', { name: m.verdict_must() })).toBeTruthy()
    // ... and the log has the entry with author, reason and cost.
    const entry = (await screen.findByText(/Babcia chce/)).closest('li')
    expect(entry?.textContent).toContain(m.decision_kind_must())
    expect(entry?.textContent).toContain('Ola')
    expect(entry?.textContent).toMatch(/min r −0,04 · budżet \+120\szł · czas \+25\smin/)
  })

  it('offers "block" for a place in the plan and recomputes without it', async () => {
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.verdict_iconic_not_yours() }))
    await user.click(await screen.findByRole('button', { name: m.verdict_block() }))
    const override = await dialog()
    expect((await within(override).findAllByText('+0,02')).length).toBeGreaterThan(0)
    await user.click(within(override).getByRole('button', { name: m.override_confirm() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Zamek Królewski' })).toBeNull(),
    )
  })

  it('shows the 409 of a place somebody vetoed in words and keeps nothing', async () => {
    const user = userEvent.setup()
    openPlan()
    await screen.findByRole('heading', { name: m.verdict_skipped_title() })
    const chips = screen.getAllByRole('button', { name: m.verdict_skip() })
    expect(VETOED_PLACE_ID).toBeTruthy()
    await user.click(chips[1] as HTMLElement)
    await user.click(await screen.findByRole('button', { name: m.verdict_force() }))
    const override = await dialog()
    expect(await within(override).findByText(m.conflict_veto_blocks_place())).toBeTruthy()
    expect(within(override).queryByRole('button', { name: m.override_confirm() })).toBeNull()
  })

  it('does not offer overrides to a co-host or a member', async () => {
    useScenario('member-readonly')
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.verdict_iconic_not_yours() }))
    const sheet = await dialog()
    expect(within(sheet).queryByRole('button', { name: m.verdict_block() })).toBeNull()
    expect(within(sheet).queryByRole('button', { name: m.verdict_force_instead() })).toBeNull()
  })
})

describe('decision log', () => {
  it('has a control for the order, kept in the URL', async () => {
    const { router } = renderApp(`/trips/${TRIP_ID}?tab=plan&dir=asc`)
    expect(await screen.findByRole('combobox', { name: m.decision_log_order() })).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ dir: 'asc' })
  })

  it('starts empty with a hint', async () => {
    openPlan()
    expect(await screen.findByText(m.decision_log_empty_title())).toBeTruthy()
  })

  it('reads the page and the kind filter from the URL', async () => {
    const { router } = renderApp(`/trips/${TRIP_ID}?tab=plan&decision=block&size=10`)
    expect(await screen.findByText(m.decision_log_empty_title())).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ decision: 'block', size: 10 })
    expect(SKIPPED_PLACE_ID).toBeTruthy()
  })
})
