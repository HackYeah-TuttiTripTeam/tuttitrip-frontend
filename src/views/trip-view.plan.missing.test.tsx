// @vitest-environment jsdom
import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 10_000 })
vi.setConfig({ testTimeout: 30_000 })

const PLANS = '*/api/v1/trips/:tripId/plans'

const missing = (...inputs: [string, string][]) =>
  HttpResponse.json(
    {
      detail: {
        code: 'plan.missing_inputs',
        message: 'The trip lacks data the plan needs',
        missing: inputs.map(([field, kind]) => ({ field, kind, person_id: null, options: [] })),
      },
    },
    { status: 422 },
  )

const compute = async () => {
  renderApp(`/trips/${TRIP_ID}?tab=plan`)
  fireEvent.click(await screen.findByRole('button', { name: m.plan_compute() }))
}

describe('Plan tab, braki w danych', () => {
  it('asks for the missing dates on the interview card and builds the plan by itself', async () => {
    useScenario('no-plan')
    let patched: unknown = null
    server.use(
      http.post(PLANS, () => missing(['dates', 'date_range']), { once: true }),
      http.patch('*/api/v1/trips/:tripId', async ({ request }) => {
        patched = await request.clone().json()
      }),
    )
    const user = userEvent.setup()
    await compute()

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: m.plan_missing_q_dates() })).toBeTruthy()
    await user.type(within(dialog).getByLabelText(m.interview_dates_start()), '2027-03-04')
    await user.type(within(dialog).getByLabelText(m.interview_dates_end()), '2027-03-06')
    await user.click(within(dialog).getByRole('button', { name: m.interview_card_submit() }))

    await waitFor(() => expect(patched).toMatchObject({ start_date: '2027-03-04' }))
    expect(patched).toMatchObject({ end_date: '2027-03-06' })
    expect(await screen.findByText('Zamek Królewski')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks one question after another when several things are missing', async () => {
    useScenario('no-plan')
    server.use(
      http.post(PLANS, () => missing(['destination', 'city'], ['dates', 'date_range']), {
        once: true,
      }),
    )
    await compute()
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: m.plan_missing_q_destination() }),
    ).toBeTruthy()
    expect(within(dialog).getByRole('combobox', { name: m.interview_city_label() })).toBeTruthy()
    expect(within(dialog).getByText(m.plan_missing_step({ step: 1, total: 2 }))).toBeTruthy()
  })

  it('asks for another city when the catalog has no places for this one', async () => {
    useScenario('no-plan')
    server.use(
      http.post(
        PLANS,
        () =>
          HttpResponse.json(
            { detail: { code: 'plan.catalog_empty', message: 'The city has no places' } },
            { status: 409 },
          ),
        { once: true },
      ),
    )
    await compute()
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(m.plan_missing_catalog_body())).toBeTruthy()
    expect(within(dialog).getByRole('combobox', { name: m.interview_city_label() })).toBeTruthy()
  })

  it('keeps a button to open the questions again after the dialog is closed', async () => {
    useScenario('no-plan')
    server.use(http.post(PLANS, () => missing(['dates', 'date_range']), { once: true }))
    const user = userEvent.setup()
    await compute()
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText(m.plan_compute_missing())).toBeTruthy()
    await user.click(screen.getByRole('button', { name: m.plan_missing_reopen() }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
  })

  it.each([
    ['offline', () => HttpResponse.error(), () => m.plan_compute_offline()],
    [
      'server',
      () => HttpResponse.json({ detail: 'x' }, { status: 503 }),
      () => m.plan_compute_server(),
    ],
  ])('says what happened on a %s failure', async (_name, answer, text) => {
    useScenario('no-plan')
    server.use(http.post(PLANS, answer))
    await compute()
    expect(await screen.findByText(text())).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
