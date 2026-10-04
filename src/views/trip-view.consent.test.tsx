// @vitest-environment jsdom
import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
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

const openPlan = () => renderApp(`/trips/${TRIP_ID}?tab=plan`)

describe('budget consent window', () => {
  it('shows the amount over B_do, the price of a point, who gains and the plan within the limit', async () => {
    useScenario('needs-approval')
    openPlan()
    const consent = await screen.findByRole('dialog', { name: m.consent_title() })
    expect(within(consent).getAllByText(/\+90\szł/).length).toBeGreaterThan(0)
    expect(within(consent).getAllByText(/3\szł\sza\spunkt/).length).toBeGreaterThan(0)
    expect(within(consent).getByText(/Babcia Halina: \+30 pkt/)).toBeTruthy()
    expect(within(consent).getByText(/1\s580\szł/)).toBeTruthy()
    expect(within(consent).getByRole('button', { name: m.consent_approve() })).toBeTruthy()
  })

  it('does not close on a click outside or on Escape, only on "Później"', async () => {
    useScenario('needs-approval')
    const user = userEvent.setup()
    openPlan()
    await screen.findByRole('dialog', { name: m.consent_title() })

    fireEvent.pointerDown(document.body)
    fireEvent.click(document.body)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: m.consent_title() })).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.dialog_close() })).toBeNull()

    await user.click(screen.getByRole('button', { name: m.consent_later() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // The banner stays and brings the window back.
    await user.click(screen.getByRole('button', { name: m.consent_banner_open() }))
    expect(await screen.findByRole('dialog', { name: m.consent_title() })).toBeTruthy()
  })

  it('approving keeps the plan over budget, closes the window and logs the decision', async () => {
    useScenario('needs-approval')
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.consent_approve() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText(/Host zatwierdził przekroczenie budżetu o 90\szł/)).toBeTruthy()
    expect(await screen.findByText(m.decision_kind_budget_approval())).toBeTruthy()
    // The log row has the outcome, the amount over the limit and the price of a point.
    const row = (await screen.findByText(/zatwierdzone · 90\szł ponad granicę/)).textContent
    expect(row).toMatch(/3\szł za punkt/)
  })

  it('rejecting makes the plan within the limit the active one', async () => {
    useScenario('needs-approval')
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.consent_reject() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText(/1\s580\szł/)).toBeTruthy()
    expect(screen.queryByText(/czeka na Twoją zgodę/)).toBeNull()
    expect(screen.queryByRole('button', { name: m.consent_banner_open() })).toBeNull()
  })

  it('explains a 409 (decided already or plan recomputed) and refreshes the plan', async () => {
    useScenario('needs-approval')
    server.use(
      http.post('*/api/v1/trips/:tripId/budget-approvals/:id/approve', () =>
        HttpResponse.json({ detail: 'budget_approval.not_pending' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    openPlan()
    await user.click(await screen.findByRole('button', { name: m.consent_approve() }))
    expect(await screen.findByText(m.consent_changed())).toBeTruthy()
  })

  it('tells a co-host that the host decides and gives no buttons', async () => {
    useScenario('needs-approval', {
      tweak: (world) => {
        for (const trip of world.trips) trip.my_role = 'co_host'
      },
    })
    openPlan()
    expect(await screen.findByText(/czeka na zgodę hosta/)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: m.consent_approve() })).toBeNull()
    expect(screen.queryByRole('button', { name: m.consent_banner_open() })).toBeNull()
  })

  it('shows nothing for a plan within the budget', async () => {
    openPlan()
    await screen.findByText(m.plan_version({ n: 1 }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
