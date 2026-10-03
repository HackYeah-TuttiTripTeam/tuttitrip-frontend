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
  const state: { answer: Response | ((request: Request) => Response) | null } = { answer: null }
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
  globalThis.fetch = async (input: RequestInfo | URL) => {
    if (!state.answer) throw new TypeError('no answer stubbed')
    if (typeof state.answer !== 'function') return state.answer.clone()
    return state.answer(input instanceof Request ? input : new Request(input))
  }
  return state
})

// jsdom has no matchMedia; the phone layout (drawer) is what these tests render.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }) as unknown as MediaQueryList

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

const KASIA_ID = '6b1c0f4e-0000-4000-8000-000000000001'
const OLA_ID = '6b1c0f4e-0000-4000-8000-000000000002'

const profile = (
  display_name: string,
  age: number,
  age_group: string,
  user_sub: string | null,
) => ({
  id: display_name === 'Kasia' ? KASIA_ID : OLA_ID,
  trip_id: TRIP_ID,
  display_name,
  age,
  age_group,
  user_sub,
  weight: 1,
  segment_km: age < 13 ? 1 : 3,
  daily_km: age < 13 ? 4 : 12,
  active_min: age < 13 ? 300 : 600,
  stairs_sensitivity: 0.2,
  queue_patience_min: 20,
  nap_start: null,
  nap_minutes: 0,
  floor: 30,
  customized_fields: display_name === 'Ola' ? ['daily_km'] : [],
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** What the stubbed fetch answers next (set per test by stubApi). */
function stubApi(answer: Response | ((request: Request) => Response)) {
  api.answer = answer
}

/** Answers by endpoint: the trip, its profiles and its members. */
function stubTrip(role: Trip['my_role'], profiles: unknown[] = [], members: unknown[] = []) {
  stubApi((request) => {
    const { pathname } = new URL(request.url)
    if (pathname.endsWith('/profiles')) return json(200, profiles)
    if (pathname.endsWith('/members')) return json(200, members)
    return json(200, trip(role))
  })
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

describe('TripPeopleView', () => {
  it('lets a host add people and hides the button from a member', async () => {
    stubTrip('host')
    renderAt(`/trips/${TRIP_ID}?tab=people`)
    expect(await screen.findByText(m.people_empty_title())).toBeTruthy()
    expect(screen.getAllByRole('button', { name: m.people_add() }).length).toBeGreaterThan(0)
    cleanup()
    queryClient.clear()

    stubTrip('member')
    renderAt(`/trips/${TRIP_ID}?tab=people`)
    const panel = await screen.findByRole('tabpanel')
    expect(await within(panel).findByText(m.people_empty_body_member())).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.people_add() })).toBeNull()
  })

  it('lists people with values from the server, marked from the server list of customized fields', async () => {
    stubTrip(
      'host',
      [profile('Kasia', 6, 'child', null), profile('Ola', 34, 'adult', 'sub|1')],
      [{ profile_id: OLA_ID, display_name: 'Ola', role: 'host', is_me: true }],
    )
    renderAt(`/trips/${TRIP_ID}?tab=people`)
    expect(await screen.findByText('Kasia')).toBeTruthy()
    const list = screen.getByRole('list', { name: m.people_list_label() })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    // The host (Ola, linked to an account) comes first and cannot be edited here.
    expect(within(list).getAllByRole('listitem')[0]?.textContent).toContain('Ola')
    expect(within(list).getAllByRole('button')).toHaveLength(1)
    expect(within(list).getAllByText(m.people_source_default())).toHaveLength(1)
    expect(
      within(list).getByText(
        m.people_source_changed({ fields: m.people_walk_label().toLowerCase() }),
      ),
    ).toBeTruthy()
    expect(within(list).getAllByText(m.people_nap_none())).toHaveLength(2)
  })

  it('shows an error with a retry when the people cannot be loaded', async () => {
    stubApi((request) => {
      const { pathname } = new URL(request.url)
      if (pathname.endsWith('/profiles')) return json(500, { detail: 'boom' })
      return pathname.endsWith('/members') ? json(200, []) : json(200, trip('host'))
    })
    renderAt(`/trips/${TRIP_ID}?tab=people`)
    expect(
      await screen.findByText(m.people_load_failed_title(), {}, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
  })
})
