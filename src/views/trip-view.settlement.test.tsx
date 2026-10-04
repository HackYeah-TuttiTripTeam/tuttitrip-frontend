// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 5000 })

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

const open = () => renderApp(`/trips/${TRIP_ID}?tab=expenses&section=settlement`)
const transfers = () => screen.findByRole('region', { name: m.settlement_transfers_title() })

describe('closing and reopening the settlement', () => {
  it('lets the host close it after a confirmation, then freezes the expenses', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    await user.click(await screen.findByRole('button', { name: m.settlement_close() }))
    // The dialog explains what closing does before anything is sent.
    expect(screen.getByText(m.settlement_close_body())).toBeTruthy()
    await user.click(screen.getByRole('button', { name: m.settlement_close_confirm() }))

    expect(await screen.findByText(m.settlement_closed_note())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.settlement_reopen() })).toBeTruthy()
    // No payment buttons on a closed settlement.
    expect(screen.queryByRole('button', { name: m.settlement_mark_paid() })).toBeNull()
  })

  it('lets the host reopen it', async () => {
    useScenario('settlement-closed')
    const user = userEvent.setup()
    open()
    await user.click(await screen.findByRole('button', { name: m.settlement_reopen() }))
    await user.click(screen.getByRole('button', { name: m.settlement_reopen_confirm() }))
    await waitFor(() => expect(screen.queryByText(m.settlement_closed_note())).toBeNull())
    expect(screen.getByRole('button', { name: m.settlement_close() })).toBeTruthy()
  })

  it('does not show the buttons to a member', async () => {
    useScenario('member-readonly')
    open()
    await transfers()
    expect(screen.queryByRole('button', { name: m.settlement_close() })).toBeNull()
    expect(screen.queryByRole('button', { name: m.settlement_reopen() })).toBeNull()
  })

  it('explains a 403 and a 409 with drafts waiting', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    server.use(
      http.post(
        '*/api/v1/trips/:tripId/expenses/settlement/close',
        () => new HttpResponse(null, { status: 403 }),
      ),
    )
    await user.click(await screen.findByRole('button', { name: m.settlement_close() }))
    await user.click(screen.getByRole('button', { name: m.settlement_close_confirm() }))
    expect(await screen.findByText(m.settlement_error_forbidden())).toBeTruthy()

    server.use(
      http.post('*/api/v1/trips/:tripId/expenses/settlement/close', () =>
        HttpResponse.json({ detail: '2 drafts' }, { status: 409 }),
      ),
    )
    await user.click(screen.getByRole('button', { name: m.settlement_close_confirm() }))
    expect(await screen.findByText(m.settlement_error_drafts())).toBeTruthy()
  })
})

describe('marking transfers as paid', () => {
  it('moves a paid transfer to the paid list and takes it back', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    const list = await transfers()
    const before = within(list).getAllByRole('listitem').length
    await user.click(
      within(list).getAllByRole('button', {
        name: /^Oznacz przelew|^Mark the transfer/,
      })[0] as HTMLElement,
    )

    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: m.settlement_transfers_title() })).queryAllByRole(
          'listitem',
        ),
      ).toHaveLength(before - 1),
    )
    const paid = await screen.findByRole('region', { name: m.settlement_payments_title() })
    expect(within(paid).getAllByRole('listitem')).toHaveLength(1)

    await user.click(
      within(paid).getByRole('button', { name: /^Cofnij oznaczenie|^Undo the paid/ }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: m.settlement_payments_title() })).toBeNull(),
    )
    expect(within(await transfers()).getAllByRole('listitem')).toHaveLength(before)
  })

  it('says the settlement is closed on a 409', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    const list = await transfers()
    server.use(
      http.post('*/api/v1/trips/:tripId/expenses/settlement/payments', () =>
        HttpResponse.json({ detail: 'closed' }, { status: 409 }),
      ),
    )
    await user.click(
      within(list).getAllByRole('button', {
        name: /^Oznacz przelew|^Mark the transfer/,
      })[0] as HTMLElement,
    )
    expect(await screen.findByText(m.expense_error_closed())).toBeTruthy()
  })
})
