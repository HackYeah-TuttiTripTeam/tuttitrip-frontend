// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 10_000 })

const openPlan = (search = '') => renderApp(`/trips/${TRIP_ID}?tab=plan${search}`)
const rows = (scope: HTMLElement) =>
  within(scope).getByRole('list', { name: m.proposal_answers_title() })
const section = async () => screen.findByRole('region', { name: m.proposal_title() })

describe('Plan, wysyłka do zatwierdzenia', () => {
  it('lets the host send the plan and then shows its status', async () => {
    useScenario('proposal-none')
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.proposal_send() }))
    const card = await section()
    expect(within(card).getByText(m.proposal_status_pending())).toBeTruthy()
    expect(within(card).getByText(/Marek/)).toBeTruthy()
    // Nobody answered: the form of the host (also a member) is there.
    expect(within(card).getByRole('button', { name: m.proposal_approve() })).toBeTruthy()
  })

  it('shows members nothing before the host sends the plan', async () => {
    useScenario('member-readonly')
    openPlan()
    await screen.findByText(m.plan_version({ n: 1 }))
    expect(screen.queryByRole('button', { name: m.proposal_send() })).toBeNull()
    expect(screen.queryByRole('region', { name: m.proposal_title() })).toBeNull()
  })

  it('blocks sending a preliminary plan and says why', async () => {
    useScenario('proposal-draft')
    openPlan()
    const send = await screen.findByRole('button', { name: m.proposal_send() })
    expect(send).toHaveProperty('disabled', true)
    expect(screen.getByText(m.proposal_send_blocked())).toBeTruthy()
    expect(screen.getByRole('region', { name: m.plan_draft_title() })).toBeTruthy()
  })
})

describe('Plan, odpowiedź członka', () => {
  it('shows the plan and three actions to a member', async () => {
    useScenario('proposal-member')
    openPlan()
    const card = await section()
    expect(within(card).getByRole('button', { name: m.proposal_approve() })).toBeTruthy()
    expect(within(card).getByRole('button', { name: m.proposal_reject() })).toBeTruthy()
    expect(within(card).getByRole('button', { name: m.proposal_comment() })).toBeTruthy()
    expect(screen.getByRole('tablist', { name: m.plan_days_label() })).toBeTruthy()
  })

  it('sends a rejection with a remark and the host-side list shows it by name', async () => {
    useScenario('proposal-sent')
    const user = userEvent.setup()
    openPlan()
    const card = await section()
    await user.type(
      within(card).getByRole('textbox', { name: m.proposal_remark_label() }),
      'Za drogo',
    )
    await user.click(within(card).getByRole('button', { name: m.proposal_reject() }))
    const answers = await screen.findByRole('region', { name: m.proposal_answers_title() })
    await waitFor(() => expect(within(answers).getByText('Za drogo')).toBeTruthy())
    expect(within(answers).getByText(/Ola \(/)).toBeTruthy()
    expect(within(await section()).getByText(m.proposal_status_rejected())).toBeTruthy()
  })

  it('does not send a remark-less comment', async () => {
    useScenario('proposal-sent')
    openPlan()
    const card = await section()
    expect(within(card).getByRole('button', { name: m.proposal_comment() })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('explains an outdated proposal and offers a new version to the host', async () => {
    useScenario('proposal-outdated')
    openPlan()
    const card = await section()
    expect(within(card).getByText(m.proposal_status_outdated())).toBeTruthy()
    expect(within(card).getByText(m.proposal_outdated_host())).toBeTruthy()
    expect(within(card).queryByRole('button', { name: m.proposal_approve() })).toBeNull()
    expect(within(card).getByRole('button', { name: m.proposal_send_again() })).toBeTruthy()
  })

  it('tells a member to wait for a new version', async () => {
    useScenario('proposal-outdated', {
      tweak: (world) => {
        world.trips = world.trips.map((entry) => ({ ...entry, my_role: 'member' as const }))
      },
    })
    openPlan()
    const card = await section()
    expect(within(card).getByText(m.proposal_outdated_member())).toBeTruthy()
    expect(within(card).queryByRole('button', { name: m.proposal_send_again() })).toBeNull()
  })

  it('shows the 409 when the plan changed while the member was answering', async () => {
    useScenario('proposal-sent')
    server.use(
      http.put('*/api/v1/trips/:tripId/proposals/:proposalId/response', () =>
        Response.json(
          { detail: { code: 'proposal.outdated', message: 'x', latest_plan_id: 'p' } },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    openPlan()
    const card = await section()
    await user.click(within(card).getByRole('button', { name: m.proposal_approve() }))
    expect((await screen.findAllByText(m.proposal_error_answer_outdated())).length).toBeGreaterThan(
      0,
    )
  })

  it('lists people without an account apart', async () => {
    useScenario('proposal-sent')
    openPlan()
    const card = await section()
    expect(within(card).getByText(/Zosia, Antek/)).toBeTruthy()
  })
})

describe('Plan, lista odpowiedzi w adresie', () => {
  // Radix Select scrolls the chosen option into view, which jsdom cannot.
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined
  })

  it('pages, filters and sorts the answers, and keeps the state in the URL', async () => {
    useScenario('proposal-many-answers')
    const user = userEvent.setup()
    const { router } = openPlan('&answers_size=10')
    const answers = await screen.findByRole('region', { name: m.proposal_answers_title() })
    expect(within(rows(answers)).getAllByRole('listitem')).toHaveLength(10)

    await user.click(within(answers).getByRole('button', { name: m.list_next() }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ answers_page: 2 }))
    expect(within(rows(answers)).getAllByRole('listitem')).toHaveLength(10)

    await user.click(within(answers).getByRole('combobox', { name: m.proposal_filter_label() }))
    await user.click(await screen.findByRole('option', { name: m.proposal_filter_reject() }))
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ answers_filter: 'reject' }),
    )
    // Back on page 1 with only the rejections (every fifth of 25).
    expect(router.state.location.search).not.toHaveProperty('answers_page')
    expect(within(rows(answers)).getAllByRole('listitem')).toHaveLength(5)

    await user.click(within(answers).getByRole('button', { name: m.trips_filters_clear() }))
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('answers_filter'))
  }, 30_000)

  it('opens on the state in the URL', async () => {
    useScenario('proposal-many-answers')
    openPlan('&answers_filter=comment&answers_sort=name&answers_dir=asc')
    const answers = await screen.findByRole('region', { name: m.proposal_answers_title() })
    const names = within(answers)
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '')
    expect(names.length).toBeGreaterThan(0)
    expect(names.every((text) => text.includes(m.proposal_decision_comment()))).toBe(true)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

describe('Plan, kalendarz', () => {
  let created: Blob[]
  beforeEach(() => {
    created = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob)
      return 'blob:mock'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps the button off until everyone approved, with the reason', async () => {
    useScenario('proposal-sent')
    openPlan()
    const card = await section()
    const add = within(card).getByRole('button', { name: m.calendar_add() })
    expect(add).toHaveProperty('disabled', true)
    expect(within(card).getByText(m.calendar_hint_locked())).toBeTruthy()
  })

  it('downloads the .ics file after the card is confirmed', async () => {
    useScenario('proposal-approved')
    const user = userEvent.setup()
    openPlan()
    const card = await section()
    expect(within(card).getByText(m.proposal_status_approved())).toBeTruthy()
    await user.click(within(card).getByRole('button', { name: m.calendar_add() }))
    const dialog = await screen.findByRole('dialog', { name: m.calendar_card_title() })
    expect(created).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: m.calendar_download() }))
    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0]?.type).toContain('text/calendar')
    expect(await within(dialog).findByText(m.calendar_done())).toBeTruthy()
  })

  it('says so when the API no longer treats the plan as approved', async () => {
    useScenario('proposal-approved')
    server.use(
      http.get('*/api/v1/trips/:tripId/plans/:planId/calendar.ics', () =>
        Response.json({ detail: { code: 'plan.not_approved', message: 'x' } }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    openPlan()
    await user.click(within(await section()).getByRole('button', { name: m.calendar_add() }))
    const dialog = await screen.findByRole('dialog', { name: m.calendar_card_title() })
    await user.click(within(dialog).getByRole('button', { name: m.calendar_download() }))
    expect(await within(dialog).findByText(m.calendar_error_not_approved())).toBeTruthy()
    expect(created).toHaveLength(0)
  })
})
