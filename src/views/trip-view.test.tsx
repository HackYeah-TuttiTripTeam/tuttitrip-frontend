// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plan } from '@/api/queries/plans'
import type { Trip } from '@/api/queries/trips'
import { queryClient } from '@/lib/query-client'
import { m } from '@/paraglide/messages'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { routeTree } from '@/routeTree.gen'

// openapi-fetch captures globalThis.fetch when the client is created, so the stub is installed
// before the app modules load. The real client, ApiError and the classifier still run.
const api = vi.hoisted(() => {
  const state: {
    answer: Response | null
    plan: Response | null
    posts: number
    gate: Promise<void> | null
  } = {
    answer: null,
    plan: null,
    posts: 0,
    gate: null,
  }
  // The client calls relative URLs (same-origin proxy); Node's Request needs an absolute one.
  const BaseRequest = globalThis.Request
  globalThis.Request = class extends BaseRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(
        typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input,
        init,
      )
    }
  }
  globalThis.fetch = async (input) => {
    const request = input instanceof Request ? input : new Request(String(input))
    if (new URL(request.url).pathname.includes('/plans')) {
      if (request.method === 'POST') {
        state.posts += 1
        await state.gate
      }
      return (state.plan ?? new Response('{}', { status: 404 })).clone()
    }
    if (!state.answer) throw new TypeError('no answer stubbed')
    return state.answer.clone()
  }
  return state
})

const TRIP_ID = '3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11'

const trip = (role: Trip['my_role']): Trip => ({
  id: TRIP_ID,
  name: 'Majówka w Krakowie',
  destination: 'Kraków',
  created_at: '2026-10-01T10:00:00Z',
  start_date: '2026-10-09',
  end_date: '2026-10-12',
  day_start: '09:00:00',
  day_end: '21:00:00',
  city_slug: null,
  currency: null,
  budget_total_min: null,
  budget_total_max: null,
  budget_day_min: null,
  budget_day_max: null,
  budget_flex_pct: 0,
  fairness_alpha: 1,
  my_role: role,
  kind: 'trip',
})

const stop = (over: Partial<Plan['days'][number]['items'][number]> = {}) => ({
  place_id: '7d1f7a52-1f0b-4a39-8f0e-7a7c9a1c0b01',
  name: 'Muzeum Gdańska',
  kind: 'attraction' as const,
  lat: 54.35,
  lon: 18.66,
  start: '10:00:00',
  end: '12:00:00',
  transfer: null,
  cost_per_person: '25.00',
  price_base: '25.00',
  price_inflated: '25.00',
  price_verified: true,
  price_source_url: 'https://tickets.example.com/muzeum',
  price_verified_at: '2026-09-20T09:00:00Z',
  hours_verified: true,
  hours_source_url: 'https://hours.example.com/muzeum',
  hours_verified_at: '2026-09-20T09:00:00Z',
  google_place_id: null,
  ...over,
})

const plan = (): Plan =>
  ({
    id: '85696247-04f0-5d19-beb7-b80f2c6162e4',
    trip_id: TRIP_ID,
    version: 2,
    plan_hash: '0ba4b2876b9dffff',
    budget: { currency: 'PLN' },
    days: [
      {
        index: 1,
        date: '2026-10-09',
        items: [
          stop(),
          stop({
            place_id: '7d1f7a52-1f0b-4a39-8f0e-7a7c9a1c0b02',
            name: 'Restauracja indyjska',
            kind: 'food',
            start: '13:00:00',
            end: '14:30:00',
            transfer: { minutes: 15, mode: 'transit', cost: '4.60' },
            cost_per_person: '575.00',
            price_base: '500.00',
            price_inflated: '575.00',
            price_verified: false,
            price_source_url: null,
            price_verified_at: null,
            hours_verified: false,
            hours_source_url: null,
            hours_verified_at: null,
          }),
        ],
      },
      {
        index: 2,
        date: '2026-10-10',
        items: [
          stop({
            name: 'Hevelianum',
            cost_per_person: null,
            price_base: null,
            price_inflated: null,
          }),
        ],
      },
      { index: 3, date: '2026-10-11', items: [stop({ name: 'Park Oliwski' })] },
    ],
  }) as unknown as Plan

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** What the stubbed fetch answers next (set per test by stubApi). */
function stubApi(answer: Response) {
  api.answer = answer
}

function renderAt(url: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
    context: { queryClient },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  queryClient.clear()
  api.answer = null
  api.plan = null
  api.posts = 0
  api.gate = null
  overwriteGetLocale(() => 'pl')
})

describe('TripView', () => {
  beforeEach(() => overwriteGetLocale(() => 'pl'))

  it('shows "not found" with a way back to the list on a 404', async () => {
    stubApi(json(404, { detail: 'Trip not found' }))
    renderAt(`/trips/${TRIP_ID}`)
    expect(await screen.findByText(m.trip_not_found_title())).toBeTruthy()
    const back = screen.getByRole('link', { name: m.trip_not_found_back() })
    expect(back.getAttribute('href')).toBe('/trips')
  })

  it('opens the tab named in the URL', async () => {
    stubApi(json(200, trip('host')))
    renderAt(`/trips/${TRIP_ID}?tab=plan`)
    const plan = await screen.findByRole('tab', { name: m.trip_tab_plan() })
    expect(plan.getAttribute('aria-selected')).toBe('true')
  })

  it('falls back to the interview for an unknown tab', async () => {
    stubApi(json(200, trip('host')))
    renderAt(`/trips/${TRIP_ID}?tab=nope`)
    const interview = await screen.findByRole('tab', { name: m.trip_tab_interview() })
    expect(interview.getAttribute('aria-selected')).toBe('true')
  })

  it('shows host-only text to a host but not to a member', async () => {
    stubApi(json(200, trip('host')))
    renderAt(`/trips/${TRIP_ID}?tab=people`)
    expect(await screen.findByText(m.trip_people_body_manage())).toBeTruthy()
    cleanup()
    queryClient.clear()

    stubApi(json(200, trip('member')))
    renderAt(`/trips/${TRIP_ID}?tab=people`)
    const panel = await screen.findByRole('tabpanel')
    expect(within(panel).getByText(m.trip_people_body_member())).toBeTruthy()
    expect(screen.queryByText(m.trip_people_body_manage())).toBeNull()
  })

  describe('Plan tab', () => {
    const openPlan = (role: Trip['my_role'] = 'host') => {
      stubApi(json(200, trip(role)))
      renderAt(`/trips/${TRIP_ID}?tab=plan`)
    }

    it('shows days as tabs and stops with times and costs', async () => {
      api.plan = json(200, plan())
      openPlan()
      const days = await screen.findByRole('tablist', { name: m.plan_days_label() })
      expect(within(days).getAllByRole('tab')).toHaveLength(3)
      expect(screen.getByText('Muzeum Gdańska')).toBeTruthy()
      expect(screen.getByText('10:00')).toBeTruthy()
      expect(screen.getByText(m.plan_price_per_person({ amount: '25 zł' }))).toBeTruthy()
      expect(screen.getByText(/Wersja 2/)).toBeTruthy()
      expect(screen.getByText('0ba4b2876b9d')).toBeTruthy()
      expect(screen.getByText(/4,60/)).toBeTruthy()
      fireEvent.mouseDown(within(days).getByRole('tab', { name: m.plan_day_n({ n: 2 }) }), {
        button: 0,
      })
      expect(await screen.findByText('Hevelianum')).toBeTruthy()
      expect(screen.getByText(m.plan_price_none())).toBeTruthy()
    })

    it('marks a verified price with its date and an unverified one with the budgeted amount', async () => {
      api.plan = json(200, plan())
      openPlan()
      expect(await screen.findByText(/Cena zweryfikowana, 20 wrz/)).toBeTruthy()
      expect(screen.getByText(m.plan_price_unverified())).toBeTruthy()
      expect(screen.getByText(m.plan_hours_unverified())).toBeTruthy()
      expect(screen.getByText(/w budżecie 575\szł/)).toBeTruthy()
      expect(screen.getByText(m.plan_price_per_person({ amount: '500 zł' }))).toBeTruthy()
      const source = screen.getByRole('link', { name: /tickets.example.com/ })
      expect(source.getAttribute('href')).toBe('https://tickets.example.com/muzeum')
    })

    it('shows the empty state and builds the plan on click', async () => {
      openPlan()
      const button = await screen.findByRole('button', { name: m.plan_compute() })
      api.plan = json(201, plan())
      fireEvent.click(button)
      expect(await screen.findByText('Muzeum Gdańska')).toBeTruthy()
      expect(api.posts).toBe(1)
      expect(screen.queryByText(m.plan_empty_title())).toBeNull()
    })

    it('tells a member the host has not built the plan, without a button', async () => {
      openPlan('member')
      expect(await screen.findByText(m.plan_empty_body_member())).toBeTruthy()
      expect(screen.queryByRole('button', { name: m.plan_compute() })).toBeNull()
    })

    it('keeps the old plan on screen while it is recalculated', async () => {
      api.plan = json(200, plan())
      let release = () => {}
      api.gate = new Promise((resolve) => {
        release = resolve
      })
      openPlan()
      fireEvent.click(await screen.findByRole('button', { name: m.plan_recompute() }))
      await waitFor(() => expect(screen.getByText(m.plan_recomputing_status())).toBeTruthy())
      expect(screen.getByText('Muzeum Gdańska')).toBeTruthy()
      release()
      await waitFor(() => expect(screen.queryByText(m.plan_recomputing_status())).toBeNull())
    })

    it('offers a retry when the plan cannot be loaded', async () => {
      api.plan = json(500, { detail: 'boom' })
      openPlan()
      expect(
        await screen.findByText(m.plan_load_failed_title(), {}, { timeout: 5000 }),
      ).toBeTruthy()
    })
  })
})
