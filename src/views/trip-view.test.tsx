// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Trip } from '@/api/queries/trips'
import { queryClient } from '@/lib/query-client'
import { m } from '@/paraglide/messages'
import { routeTree } from '@/routeTree.gen'

// openapi-fetch captures globalThis.fetch when the client is created, so the stub is installed
// before the app modules load. The real client, ApiError and the classifier still run.
const api = vi.hoisted(() => {
  const state: { answer: Response | null } = { answer: null }
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
  globalThis.fetch = async () => {
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
})

describe('TripView', () => {
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
    expect(screen.getByText(m.trip_plan_title())).toBeTruthy()
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
})
