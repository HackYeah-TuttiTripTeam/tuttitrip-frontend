// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { OUTING_ID, plan, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'
import { overwriteGetLocale } from '@/paraglide/runtime'

const PLANS = '*/api/v1/trips/:tripId/plans'
const dayTab = (n: number) => screen.getByRole('tab', { name: m.plan_day_n({ n }) })

/** Switch to a day of the plan (Radix tabs open on mouse down). */
const openDay = (n: number) => fireEvent.mouseDown(dayTab(n), { button: 0 })

describe('TripView', () => {
  it('shows "not found" with a way back to the list for an unknown trip', async () => {
    renderApp('/trips/00000000-0000-4000-8000-000000000000')
    expect(await screen.findByText(m.trip_not_found_title())).toBeTruthy()
    const back = screen.getByRole('link', { name: m.trip_not_found_back() })
    expect(back.getAttribute('href')).toBe('/trips')
  })

  it('opens the tab named in the URL', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    const tab = await screen.findByRole('tab', { name: m.trip_tab_plan() })
    expect(tab.getAttribute('aria-selected')).toBe('true')
  })

  it('falls back to the interview for an unknown tab', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=nope`)
    const interview = await screen.findByRole('tab', { name: m.trip_tab_interview() })
    expect(interview.getAttribute('aria-selected')).toBe('true')
  })

  it('explains a server error and offers a retry', async () => {
    useScenario('server-error')
    renderApp(`/trips/${TRIP_ID}`)
    expect(await screen.findByText(m.trip_load_failed_title())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
  })

  it('tells the user when the API cannot be reached', async () => {
    useScenario('offline')
    renderApp(`/trips/${TRIP_ID}`)
    expect(await screen.findByText(m.trips_offline_title())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
  })
})

describe('Plan tab, family-warsaw', () => {
  it('shows days as tabs with stops, times and the cost of the plan', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    const days = await screen.findByRole('tablist', { name: m.plan_days_label() })
    expect(within(days).getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByText('Zamek Królewski')).toBeTruthy()
    expect(screen.getByText('10:00')).toBeTruthy()
    expect(screen.getByText(m.plan_version({ n: 1 }))).toBeTruthy()
    expect(screen.getByText(/a1b2c3d4e5f6/)).toBeTruthy()
    expect(screen.getByText(/1\s480\szł/)).toBeTruthy()
    expect(screen.getByRole('button', { name: m.plan_recompute() })).toBeTruthy()
  })

  it('shows the cost of the plan and the lodging', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText(/1\s480\szł/)).toBeTruthy()
    expect(screen.getByText(/Apartament na Pradze, 1 noc/)).toBeTruthy()
    expect(screen.getByText(/420\szł za wszystkie noce/)).toBeTruthy()
  })

  it('marks a verified price with its date and a source link', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect((await screen.findAllByText(/Cena zweryfikowana, 28 wrz/)).length).toBeGreaterThan(0)
    const [source] = screen.getAllByRole('link', { name: /example.com/ })
    expect(source?.getAttribute('href')).toMatch(/^https:\/\/example\.com\//)
  })

  it('shows an unverified price next to the amount the budget counts', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText('25 zł na osobę, w budżecie 28,75 zł')).toBeTruthy()
    expect(screen.getByText(m.plan_price_unverified())).toBeTruthy()
  })

  it('shows a free stop as free, not as a zero price', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await screen.findByText('Łazienki Królewskie')
    expect(screen.getByText(m.plan_price_free())).toBeTruthy()
  })

  it('shows a transfer with its cost', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText(/Komunikacją · 25 min · 4,40/)).toBeTruthy()
  })

  it('says "no data" for a stop without a price source, hours source and transfer cost', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await screen.findByText('Zamek Królewski')
    openDay(2)
    expect(await screen.findByText('Pyzy Flaki Gorące')).toBeTruthy()
    expect(screen.getAllByText(m.plan_price_none()).length).toBeGreaterThan(0)
    expect(screen.getAllByText(m.plan_hours_none()).length).toBeGreaterThan(0)
    // The leg to the meal has no cost: the line has mode and minutes only.
    expect(screen.getByText('Komunikacją · 18 min')).toBeTruthy()
  })

  it('reads in English too', async () => {
    overwriteGetLocale(() => 'en')
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText('10:00 AM')).toBeTruthy()
    expect(screen.getByText('PLN 25 per person, PLN 28.75 in the budget')).toBeTruthy()
    expect(screen.getAllByText(/Price verified, Sep 28/).length).toBeGreaterThan(0)
  })

  it('keeps the old plan on screen while it is recalculated', async () => {
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post(PLANS, async () => {
        await gate
        return HttpResponse.json(plan(TRIP_ID, { version: 2 }), { status: 201 })
      }),
    )
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    fireEvent.click(await screen.findByRole('button', { name: m.plan_recompute() }))
    await waitFor(() => expect(screen.getByText(m.plan_recomputing_status())).toBeTruthy())
    expect(screen.getByText('Zamek Królewski')).toBeTruthy()
    release()
    expect(await screen.findByText(m.plan_version({ n: 2 }))).toBeTruthy()
    expect(screen.queryByText(m.plan_recomputing_status())).toBeNull()
  })

  it('keeps the new plan when an older fetch is still in flight as the build finishes', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await screen.findByText('Zamek Królewski')
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let posts = 0
    server.use(
      http.get(PLANS.concat('/latest'), async () => {
        await gate
        return HttpResponse.json(plan(TRIP_ID))
      }),
      http.post(PLANS, () => {
        posts += 1
        return HttpResponse.json(plan(TRIP_ID, { version: 3 }), { status: 201 })
      }),
    )
    const { queryClient } = await import('@/lib/query-client')
    void queryClient.refetchQueries({ type: 'active' })
    fireEvent.click(screen.getByRole('button', { name: m.plan_recompute() }))
    await waitFor(() => expect(posts).toBe(1))
    await screen.findByText(m.plan_version({ n: 3 }))
    release()
    await delay(50)
    expect(screen.getByText(m.plan_version({ n: 3 }))).toBeTruthy()
  })

  it('falls back to the first day when the chosen day disappears after a rebuild', async () => {
    const shorter = plan(TRIP_ID, { version: 2 })
    shorter.days = shorter.days.slice(0, 1)
    server.use(http.post(PLANS, () => HttpResponse.json(shorter, { status: 201 })))
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await screen.findByText('Zamek Królewski')
    openDay(2)
    await screen.findByText('Centrum Nauki Kopernik')
    fireEvent.click(screen.getByRole('button', { name: m.plan_recompute() }))
    expect(await screen.findByText('Zamek Królewski')).toBeTruthy()
    const tabs = within(screen.getByRole('tablist', { name: m.plan_days_label() }))
    expect(tabs.getAllByRole('tab')).toHaveLength(1)
  })

  it('never shows the plan of one trip under another', async () => {
    const { router } = renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText('Zamek Królewski')).toBeTruthy()
    await router.navigate({
      to: '/trips/$tripId',
      params: { tripId: OUTING_ID },
      search: { tab: 'plan' },
    })
    expect(await screen.findByText(m.plan_empty_title())).toBeTruthy()
    expect(screen.queryByText('Zamek Królewski')).toBeNull()
  })
})

describe('Plan tab, needs-approval', () => {
  it('shows the plan that goes over the budget with its higher cost', async () => {
    useScenario('needs-approval')
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText(/1\s690\szł/)).toBeTruthy()
    expect(screen.getByText('Zamek Królewski')).toBeTruthy()
  })
})

describe('Plan tab, no-plan', () => {
  it('shows the empty state and builds the plan on "Policz plan" without a reload', async () => {
    useScenario('no-plan')
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    fireEvent.click(await screen.findByRole('button', { name: m.plan_compute() }))
    expect(await screen.findByText('Zamek Królewski')).toBeTruthy()
    expect(screen.queryByText(m.plan_empty_title())).toBeNull()
    expect(screen.getByRole('button', { name: m.plan_recompute() })).toBeTruthy()
  })

  it('says the plan could not be built when the API fails', async () => {
    useScenario('no-plan')
    server.use(http.post(PLANS, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })))
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    fireEvent.click(await screen.findByRole('button', { name: m.plan_compute() }))
    expect(await screen.findByText(m.plan_compute_server())).toBeTruthy()
  })

  it('tells a co-host without the right that the plan cannot be built (403 on POST)', async () => {
    useScenario('no-plan', {
      tweak: (world) => {
        for (const t of world.trips) t.my_role = 'co_host'
      },
    })
    server.use(http.post(PLANS, () => HttpResponse.json({ detail: 'no' }, { status: 403 })))
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    fireEvent.click(await screen.findByRole('button', { name: m.plan_compute() }))
    expect(await screen.findByText(m.plan_compute_forbidden())).toBeTruthy()
  })
})

describe('Plan tab, member-readonly', () => {
  it('shows the plan to a member without any button to build it', async () => {
    useScenario('member-readonly')
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText('Zamek Królewski')).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.plan_recompute() })).toBeNull()
    expect(screen.queryByRole('button', { name: m.plan_compute() })).toBeNull()
  })

  it('tells a member the host has not built the plan, without a button', async () => {
    useScenario('member-readonly', { tweak: (world) => (world.plan = null) })
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText(m.plan_empty_body_member())).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.plan_compute() })).toBeNull()
  })

  it('says so when the plan is not for this account (403 on GET)', async () => {
    server.use(http.get(PLANS.concat('/latest'), () => HttpResponse.json({}, { status: 403 })))
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText(m.plan_forbidden_title())).toBeTruthy()
  })
})

describe('Plan tab, broken servers', () => {
  it('shows the load error with a retry on a server error, not endless loading', async () => {
    server.use(http.get(PLANS.concat('/latest'), () => HttpResponse.json({}, { status: 500 })))
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText(m.plan_load_failed_title())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
  })

  it('shows the offline message when only the plan request fails', async () => {
    server.use(http.get(PLANS.concat('/latest'), () => HttpResponse.error()))
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    expect(await screen.findByText(m.trips_offline_title())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
  })
})
