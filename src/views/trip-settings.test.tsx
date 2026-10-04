// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'
import { overwriteGetLocale } from '@/paraglide/runtime'

interface Call {
  method: string
  path: string
  body: Promise<Record<string, unknown> | null>
}

/** Every API request of the test, with its parsed JSON body. */
function recordCalls(): Call[] {
  const calls: Call[] = []
  server.events.on('request:start', ({ request }) => {
    const copy = request.clone()
    calls.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: copy.json().catch(() => null),
    })
  })
  return calls
}

const writes = (calls: Call[]) => calls.filter((c) => c.method !== 'GET')

const openSettings = async (url = `/trips/${TRIP_ID}`) => {
  const app = renderApp(url)
  fireEvent.click(await screen.findByRole('button', { name: m.trip_settings_open() }))
  await screen.findByRole('dialog')
  return app
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const amount = (label: string) => screen.getAllByLabelText(label)[0] as HTMLInputElement
const save = () => fireEvent.click(screen.getByRole('button', { name: m.trip_settings_save() }))
const openDetails = () => fireEvent.click(screen.getByText(m.trip_form_more()))

describe('who can edit and delete', () => {
  it('shows no settings to a member', async () => {
    useScenario('member-readonly')
    renderApp(`/trips/${TRIP_ID}`)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: m.trip_settings_open() })).toBeNull()
  })

  it('lets a co-host edit but not delete', async () => {
    useScenario('family-warsaw', {
      tweak: (w) => {
        for (const t of w.trips) t.my_role = 'co_host'
      },
    })
    await openSettings()
    expect(screen.getByRole('button', { name: m.trip_settings_save() })).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.trip_delete_open() })).toBeNull()
  })
})

describe('editing', () => {
  it('sends only what changed and shows the new budget in the header', async () => {
    const calls = recordCalls()
    await openSettings()
    openDetails()
    fireEvent.change(amount(m.trip_form_budget_max_label()), { target: { value: '2000,5' } })
    save()
    await waitFor(() => expect(writes(calls)).toHaveLength(1))
    const [patch] = writes(calls)
    expect(patch?.method).toBe('PATCH')
    expect(await patch?.body).toEqual({ budget_total_max: '2000.50' })
    expect(
      await screen.findByText(/1\s200\szł do 2\s000,50\szł, margines 10%, na całość/),
    ).toBeTruthy()
  })

  it('does not call the API when nothing changed', async () => {
    const calls = recordCalls()
    await openSettings()
    save()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(writes(calls)).toHaveLength(0)
  })

  it('explains hours in the time of the trip city', async () => {
    await openSettings()
    openDetails()
    expect(screen.getByText(m.trip_form_day_hint_zone({ zone: 'Europe/Warsaw' }))).toBeTruthy()
  })

  it('does not send a form the client can already see is wrong', async () => {
    const calls = recordCalls()
    await openSettings()
    type(m.trip_form_end_label(), '')
    save()
    expect(await screen.findByText(m.trip_form_end_required())).toBeTruthy()
    expect(writes(calls)).toHaveLength(0)
  })

  it('puts a 422 on the field its code and loc name, not on the message', async () => {
    useScenario('family-warsaw', {
      tweak: (w) => {
        w.validationErrors = [
          { type: 'trip.dates_order', loc: ['body', 'end_date'], msg: 'unrelated english text' },
        ]
      },
    })
    await openSettings()
    type(m.trip_form_name_label(), 'Inna nazwa')
    save()
    const message = await screen.findByText(m.trip_form_end_before_start())
    expect(message.closest('[data-slot="field"]')?.querySelector('#trip-end')).toBeTruthy()
    expect(screen.queryByText(m.trip_form_save_failed())).toBeNull()
  })
})

describe('creating', () => {
  const openCreate = async () => {
    const app = renderApp('/trips')
    fireEvent.click(
      (await screen.findAllByRole('button', { name: m.action_new_trip() }))[0] as HTMLElement,
    )
    await screen.findByRole('dialog')
    return app
  }

  it('is one POST with the whole body, never a second request', async () => {
    const calls = recordCalls()
    await openCreate()
    type(m.trip_form_name_label(), 'Weekend w Londynie')
    type(m.trip_form_start_label(), '2026-11-06')
    type(m.trip_form_end_label(), '2026-11-08')
    openDetails()
    fireEvent.change(amount(m.trip_form_budget_min_label()), { target: { value: '2000' } })
    fireEvent.change(amount(m.trip_form_budget_max_label()), { target: { value: '3000' } })
    fireEvent.click(screen.getByRole('button', { name: m.trip_form_submit() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const sent = writes(calls)
    expect(sent.map((c) => c.method)).toEqual(['POST'])
    expect(await sent[0]?.body).toMatchObject({
      name: 'Weekend w Londynie',
      start_date: '2026-11-06',
      end_date: '2026-11-08',
      budget_total_min: '2000',
      budget_total_max: '3000',
      currency: 'PLN',
    })
    expect(await screen.findByText('Weekend w Londynie')).toBeTruthy()
  })

  it('maps a 422 to the field and keeps the form; a retry is a POST again, not a PATCH', async () => {
    useScenario('family-warsaw', {
      tweak: (w) => {
        w.validationErrors = [{ type: 'trip.day_window_order', loc: ['body', 'day_end'], msg: 'x' }]
      },
    })
    const calls = recordCalls()
    await openCreate()
    type(m.trip_form_name_label(), 'Weekend')
    fireEvent.click(screen.getByRole('button', { name: m.trip_form_submit() }))
    expect(await screen.findByText(m.trip_form_day_end_before_start())).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: m.trip_form_submit() }))
    await waitFor(() => expect(writes(calls)).toHaveLength(2))
    expect(writes(calls).map((c) => c.method)).toEqual(['POST', 'POST'])
  })
})

describe('deleting', () => {
  const confirm = async () => {
    fireEvent.click(screen.getByRole('button', { name: m.trip_delete_open() }))
    fireEvent.click(await screen.findByRole('button', { name: m.trip_delete_confirm() }))
  }

  it('asks first, then leaves for the list, which no longer has the trip', async () => {
    const calls = recordCalls()
    const { router } = await openSettings()
    fireEvent.click(screen.getByRole('button', { name: m.trip_delete_open() }))
    expect(await screen.findByText(m.trip_delete_title())).toBeTruthy()
    expect(writes(calls)).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: m.trip_delete_confirm() }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'))
    await waitFor(() => expect(screen.queryByText('Warszawa z rodziną')).toBeNull())
    expect(screen.queryByText(m.trip_not_found_title())).toBeNull()
  })

  it('does not refetch the deleted trip, so no "not found" flashes', async () => {
    const calls = recordCalls()
    const { router } = await openSettings()
    await confirm()
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'))
    await new Promise((resolve) => setTimeout(resolve, 100))
    const after = calls.slice(calls.findIndex((c) => c.method === 'DELETE') + 1)
    expect(after.filter((c) => c.path.includes(`/trips/${TRIP_ID}`))).toEqual([])
  })

  it('keeps the dialog and says so when the API refuses (403)', async () => {
    useScenario('family-warsaw', {
      tweak: (w) => {
        w.failures.delete = 403
      },
    })
    const { router } = await openSettings()
    await confirm()
    expect(await screen.findByText(m.trip_delete_failed())).toBeTruthy()
    expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`)
  })
})

describe('budget amounts', () => {
  const openBudget = async () => {
    await openSettings()
    openDetails()
  }

  it('is two number fields with the currency, no slider', async () => {
    await openBudget()
    expect(screen.queryByRole('slider')).toBeNull()
    expect(amount(m.trip_form_budget_min_label()).value).toBe('1200')
    expect(amount(m.trip_form_budget_max_label()).value).toBe('1600')
    expect(screen.getAllByText('PLN').length).toBe(2)
  })

  it('takes a per-day amount far above the old 1000 limit and saves it', async () => {
    const calls = recordCalls()
    await openBudget()
    fireEvent.click(screen.getByRole('radio', { name: m.trip_form_budget_scope_day() }))
    fireEvent.change(amount(m.trip_form_budget_min_label()), { target: { value: '1500' } })
    fireEvent.change(amount(m.trip_form_budget_max_label()), { target: { value: '25000' } })
    save()
    await waitFor(() => expect(writes(calls)).toHaveLength(1))
    expect(await writes(calls)[0]?.body).toMatchObject({
      budget_day_min: '1500',
      budget_day_max: '25000',
      budget_total_min: null,
      budget_total_max: null,
    })
  })

  it('refuses "from" above "to" and does not call the API', async () => {
    const calls = recordCalls()
    await openBudget()
    fireEvent.change(amount(m.trip_form_budget_min_label()), { target: { value: '4000' } })
    save()
    expect(await screen.findByText(m.trip_form_budget_max_below_min())).toBeTruthy()
    expect(writes(calls)).toHaveLength(0)
  })

  it('clears the amounts when the scope changes', async () => {
    await openBudget()
    fireEvent.click(screen.getByRole('radio', { name: m.trip_form_budget_scope_day() }))
    expect(amount(m.trip_form_budget_min_label()).value).toBe('')
    expect(amount(m.trip_form_budget_max_label()).value).toBe('')
  })
})

describe('in English', () => {
  it('reads the form in English', async () => {
    overwriteGetLocale(() => 'en')
    await openSettings()
    openDetails()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy()
    expect(screen.getByText('Delete trip')).toBeTruthy()
    expect(screen.getByText('Where to?')).toBeTruthy()
  })
})
