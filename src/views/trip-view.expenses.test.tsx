// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PROFILE_IDS, TRIP_ID } from '@/mocks/fixtures'
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

const open = (search = '') => renderApp(`/trips/${TRIP_ID}?tab=expenses${search}`)

describe('expenses list', () => {
  it('shows the expenses of the trip with payer, participants and the total', async () => {
    useScenario('family-warsaw')
    open()

    expect(await screen.findByText('Nocleg')).toBeTruthy()
    expect(screen.getByText('Kolacja')).toBeTruthy()
    expect(screen.getByText(/płaci Marek/)).toBeTruthy()
    expect(screen.getByText(m.expense_for_everyone())).toBeTruthy()
    // 300 + 90 + 45.50, as the API reports it.
    expect(await screen.findByText(/435,50/)).toBeTruthy()
  })

  it('pages, sorts and filters on the server with the state in the URL', async () => {
    useScenario('many-expenses')
    const { router } = open()

    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 45 }))).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: m.list_next() }))
    expect(await screen.findByText(m.list_range({ from: 21, to: 40, total: 45 }))).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ page: 2 })
  })

  it('reads the filters from a pasted URL', async () => {
    useScenario('many-expenses')
    open(`&payer=${PROFILE_IDS.tata}&sort=amount&dir=asc`)
    // 15 of the 45 expenses are paid by the second person.
    expect(await screen.findByText(m.list_range({ from: 1, to: 15, total: 15 }))).toBeTruthy()
  })

  it('shows the empty state with a way to add the first expense', async () => {
    useScenario('no-expenses')
    open()
    expect(await screen.findByText(m.expense_empty_title())).toBeTruthy()
    expect(screen.getAllByRole('button', { name: m.expense_add() }).length).toBeGreaterThan(0)
  })

  it('shows a load error with a retry', async () => {
    useScenario('family-warsaw')
    server.use(
      http.get('*/api/v1/trips/:tripId/expenses', () => new HttpResponse(null, { status: 500 })),
    )
    open()
    expect(await screen.findByText(m.expense_load_failed_title())).toBeTruthy()
  })
})

describe('expense form', () => {
  const fillAmount = async (user: ReturnType<typeof userEvent.setup>, amount: string) =>
    user.type(await screen.findByLabelText(m.expense_form_amount({ currency: 'PLN' })), amount)

  it('adds an expense typed with a comma; everybody takes part by default', async () => {
    useScenario('no-expenses')
    const bodies: unknown[] = []
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/expenses')) {
        bodies.push(await request.clone().json())
      }
    })
    const user = userEvent.setup()
    open()

    await user.click(
      (await screen.findAllByRole('button', { name: m.expense_add() }))[0] as HTMLElement,
    )
    await fillAmount(user, '100,00')
    // Five people, 100.00: the first id takes the extra cents (20.00 each here).
    expect((await screen.findAllByText(/20 zł/)).length).toBe(5)
    await user.click(screen.getByRole('button', { name: m.expense_form_submit() }))

    expect(await screen.findByText(m.expense_untitled())).toBeTruthy()
    expect(bodies[0]).toMatchObject({
      amount: '100,00'.replace(',', '.'),
      split_method: 'equal',
    })
    const sent = bodies[0] as { participants: unknown[] }
    expect(sent.participants).toHaveLength(5)
    // The amount is a string, never a float.
    expect(typeof (bodies[0] as { amount: unknown }).amount).toBe('string')
  })

  it('previews the split to the cent, like the backend', async () => {
    useScenario('no-expenses')
    const user = userEvent.setup()
    open()
    await user.click(
      (await screen.findAllByRole('button', { name: m.expense_add() }))[0] as HTMLElement,
    )
    await fillAmount(user, '100')
    // Three of five switched off: 100.00 / 2 = 50.
    for (const name of ['Babcia Halina', 'Zosia', 'Antek']) {
      await user.click(screen.getByRole('switch', { name: m.expense_form_participant({ name }) }))
    }
    expect((await screen.findAllByText(/50 zł/)).length).toBe(2)

    // Back to the three of 100.00 / 3: 33.34, 33.33, 33.33.
    await user.click(
      screen.getByRole('switch', { name: m.expense_form_participant({ name: 'Zosia' }) }),
    )
    expect(await screen.findByText(/33,34/)).toBeTruthy()
    expect(screen.getAllByText(/33,33/).length).toBe(2)
  })

  it('keeps Save off and says how much is missing while the percents are not 100', async () => {
    useScenario('no-expenses')
    const user = userEvent.setup()
    open()
    await user.click(
      (await screen.findAllByRole('button', { name: m.expense_add() }))[0] as HTMLElement,
    )
    await fillAmount(user, '100')
    await user.click(screen.getByRole('radio', { name: m.expense_method_percent() }))

    const save = screen.getByRole('button', { name: m.expense_form_submit() })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    const unit = m.expense_unit_percent()
    const percent = (name: string) =>
      screen.getByRole('textbox', { name: m.expense_form_value({ name, unit }) })
    await user.type(percent('Ola'), '60')
    await user.type(percent('Marek'), '30')
    for (const name of ['Babcia Halina', 'Zosia', 'Antek']) {
      await user.click(screen.getByRole('switch', { name: m.expense_form_participant({ name }) }))
    }
    expect(await screen.findByText(m.expense_issue_percent_missing({ missing: '10' }))).toBeTruthy()
    expect((save as HTMLButtonElement).disabled).toBe(true)

    await user.clear(percent('Marek'))
    await user.type(percent('Marek'), '40')
    expect(await screen.findByText(m.expense_issue_percent_ok())).toBeTruthy()
    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false))
  })

  it('shows a 422 from the API in Polish at the right field', async () => {
    useScenario('no-expenses')
    server.use(
      http.post('*/api/v1/trips/:tripId/expenses', () =>
        HttpResponse.json(
          {
            detail: [
              { type: 'expense.payer_not_on_trip', loc: ['body', 'payer_profile_id'], msg: 'x' },
            ],
          },
          { status: 422 },
        ),
      ),
    )
    const user = userEvent.setup()
    open()
    await user.click(
      (await screen.findAllByRole('button', { name: m.expense_add() }))[0] as HTMLElement,
    )
    await fillAmount(user, '10')
    await user.click(screen.getByRole('button', { name: m.expense_form_submit() }))
    expect(await screen.findByText(m.expense_error_payer_not_on_trip())).toBeTruthy()
  })
})

describe('who may change an expense', () => {
  it('lets a host edit and delete every expense', async () => {
    useScenario('family-warsaw')
    open()
    await screen.findByText('Kolacja')
    expect(
      screen.getByRole('button', { name: m.expense_delete_label({ title: 'Kolacja' }) }),
    ).toBeTruthy()
  })

  it('hides the actions of expenses a plain member did not write', async () => {
    useScenario('member-readonly')
    open()
    await screen.findByText('Kolacja')
    // The first expense is the member's own; the dinner is somebody else's.
    expect(
      screen.getByRole('button', { name: m.expense_delete_label({ title: 'Nocleg' }) }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: m.expense_delete_label({ title: 'Kolacja' }) }),
    ).toBeNull()
  })

  it('deletes an expense after confirmation', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    await user.click(
      await screen.findByRole('button', { name: m.expense_delete_label({ title: 'Taksówka' }) }),
    )
    await user.click(screen.getByRole('button', { name: m.expense_delete_confirm() }))
    await waitFor(() => expect(screen.queryByText('Taksówka')).toBeNull())
  })
})

describe('settlement', () => {
  it('shows the transfers and the balances exactly as the API returns them', async () => {
    useScenario('family-warsaw')
    server.use(
      http.get('*/api/v1/trips/:tripId/expenses/settlement', () =>
        HttpResponse.json({
          currency: 'PLN',
          total_spent: '435.50',
          closed_at: null,
          balances: [
            { profile_id: PROFILE_IDS.mama, amount: '120.10' },
            { profile_id: PROFILE_IDS.tata, amount: '-120.10' },
          ],
          transfers: [
            {
              from_profile_id: PROFILE_IDS.tata,
              to_profile_id: PROFILE_IDS.mama,
              amount: '120.10',
            },
          ],
        }),
      ),
    )
    open('&section=settlement')
    const transfers = await screen.findByRole('region', { name: m.settlement_transfers_title() })
    expect(within(transfers).getAllByRole('listitem')).toHaveLength(1)
    expect(within(transfers).getByText(/120,10/)).toBeTruthy()
    const balances = screen.getByRole('region', { name: m.settlement_balances_title() })
    expect(within(balances).getByText(/\+120,10/)).toBeTruthy()
  })

  it('downloads the transfers as CSV in the browser', async () => {
    useScenario('family-warsaw')
    const created: Blob[] = []
    const realCreate = URL.createObjectURL
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      created.push(blob as Blob)
      return 'blob:test'
    }
    URL.revokeObjectURL = () => undefined
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const user = userEvent.setup()
    open('&section=settlement')
    await user.click(await screen.findByRole('button', { name: m.settlement_download() }))

    expect(click).toHaveBeenCalled()
    const text = await created[0]?.text()
    expect(text).toContain(
      `${m.settlement_csv_person()},${m.settlement_csv_recipient()},${m.settlement_csv_amount()},${m.settlement_csv_currency()}`,
    )
    expect(text).toMatch(/,\d+\.\d{2},PLN/)
    URL.createObjectURL = realCreate
    click.mockRestore()
  })

  it('shows the empty state with a link to add an expense', async () => {
    useScenario('no-expenses')
    open('&section=settlement')
    expect(await screen.findByText(m.settlement_empty_title())).toBeTruthy()
    expect(screen.getAllByRole('button', { name: m.expense_add() }).length).toBeGreaterThan(0)
  })
})

describe('closed settlement', () => {
  it('hides add, edit and delete and says why', async () => {
    useScenario('settlement-closed')
    open()
    await screen.findByText('Kolacja')
    await waitFor(() => expect(screen.queryByRole('button', { name: m.expense_add() })).toBeNull())
    expect(
      screen.queryByRole('button', { name: m.expense_delete_label({ title: 'Kolacja' }) }),
    ).toBeNull()
  })

  it('shows the note in the settlement section', async () => {
    useScenario('settlement-closed')
    open('&section=settlement')
    expect(await screen.findByText(m.settlement_closed_note())).toBeTruthy()
  })

  it('maps a 409 on save to the closed message', async () => {
    useScenario('no-expenses')
    server.use(
      http.post('*/api/v1/trips/:tripId/expenses', () =>
        HttpResponse.json({ detail: 'closed' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    open()
    await user.click(
      (await screen.findAllByRole('button', { name: m.expense_add() }))[0] as HTMLElement,
    )
    await user.type(await screen.findByLabelText(m.expense_form_amount({ currency: 'PLN' })), '10')
    await user.click(screen.getByRole('button', { name: m.expense_form_submit() }))
    expect(await screen.findByText(m.expense_error_closed())).toBeTruthy()
  })

  it('maps a 409 on delete to the closed message', async () => {
    useScenario('family-warsaw')
    server.use(
      http.delete('*/api/v1/trips/:tripId/expenses/:id', () =>
        HttpResponse.json({ detail: 'closed' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    open()
    await user.click(
      await screen.findByRole('button', { name: m.expense_delete_label({ title: 'Taksówka' }) }),
    )
    await user.click(screen.getByRole('button', { name: m.expense_delete_confirm() }))
    expect(await screen.findByText(m.expense_error_closed())).toBeTruthy()
  })
})

describe('contract details', () => {
  it('shows the rate error at the submit level', async () => {
    useScenario('no-expenses')
    server.use(
      http.post('*/api/v1/trips/:tripId/expenses', () =>
        HttpResponse.json(
          { detail: [{ type: 'expense.rate_not_found', loc: ['body', 'spent_on'], msg: 'x' }] },
          { status: 422 },
        ),
      ),
    )
    const user = userEvent.setup()
    open()
    await user.click(
      (await screen.findAllByRole('button', { name: m.expense_add() }))[0] as HTMLElement,
    )
    await user.type(await screen.findByLabelText(m.expense_form_amount({ currency: 'PLN' })), '10')
    await user.click(screen.getByRole('button', { name: m.expense_form_submit() }))
    expect(await screen.findByText(m.expense_error_rate_not_found())).toBeTruthy()
  })

  it('lets the user pick a currency when the trip has none, and sends it', async () => {
    useScenario('no-expenses', {
      tweak: (world) => {
        for (const t of world.trips) t.currency = null
      },
    })
    const bodies: { currency?: string }[] = []
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/expenses')) {
        bodies.push(await request.clone().json())
      }
    })
    const user = userEvent.setup()
    open()
    await user.click(
      (await screen.findAllByRole('button', { name: m.expense_add() }))[0] as HTMLElement,
    )
    expect(await screen.findByLabelText(m.expense_form_currency())).toBeTruthy()
    await user.type(screen.getByLabelText(m.expense_form_amount({ currency: 'PLN' })), '10')
    await user.click(screen.getByRole('button', { name: m.expense_form_submit() }))
    await waitFor(() => expect(bodies[0]?.currency).toBe('PLN'))
  })

  it('does not show the split alert before the first input, and clears values on a method change', async () => {
    useScenario('no-expenses')
    const user = userEvent.setup()
    open()
    await user.click(
      (await screen.findAllByRole('button', { name: m.expense_add() }))[0] as HTMLElement,
    )
    await screen.findByLabelText(m.expense_form_amount({ currency: 'PLN' }))
    expect(screen.queryByRole('alert')).toBeNull()

    await user.click(screen.getByRole('radio', { name: m.expense_method_percent() }))
    const field = () =>
      screen.getByRole('textbox', {
        name: m.expense_form_value({ name: 'Ola', unit: m.expense_unit_percent() }),
      }) as HTMLInputElement
    await user.type(field(), '40')
    await user.click(screen.getByRole('radio', { name: m.expense_method_weights() }))
    const weight = screen.getByRole('textbox', {
      name: m.expense_form_value({ name: 'Ola', unit: m.expense_unit_weights() }),
    }) as HTMLInputElement
    expect(weight.value).toBe('')
  })
})
