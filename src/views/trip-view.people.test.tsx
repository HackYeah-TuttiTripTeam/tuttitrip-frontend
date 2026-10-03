// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Member } from '@/api/queries/members'
import type { Profile } from '@/api/queries/profiles'
import type { Trip } from '@/api/queries/trips'
import { queryClient } from '@/lib/query-client'
import { m } from '@/paraglide/messages'
import { routeTree } from '@/routeTree.gen'

const TRIP_ID = '3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11'
const KASIA_ID = '6b1c0f4e-0000-4000-8000-000000000001'
const OLA_ID = '6b1c0f4e-0000-4000-8000-000000000002'

interface Call {
  method: string
  path: string
  body: unknown
}

// A tiny in-memory API: the list, create, patch and delete endpoints of profiles, plus the trip
// and its members. openapi-fetch captures globalThis.fetch when the client is created, so the
// stub is installed before the app modules load; the real client and error mapping still run.
const api = vi.hoisted(() => {
  const state = {
    trip: null as unknown,
    profiles: [] as Record<string, unknown>[],
    members: [] as unknown[],
    /** Status the next DELETE answers instead of 204. */
    deleteStatus: null as number | null,
    /** Status GET /profiles answers instead of the list. */
    listStatus: null as number | null,
    calls: [] as { method: string; path: string; body: unknown }[],
  }
  const BaseRequest = globalThis.Request
  globalThis.Request = class extends BaseRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(
        typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input,
        init,
      )
    }
  }
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  globalThis.fetch = async (input) => {
    const request = input instanceof Request ? input : new Request(String(input))
    const { pathname } = new URL(request.url)
    const method = request.method
    const body = method === 'GET' || method === 'DELETE' ? undefined : await request.json()
    state.calls.push({ method, path: pathname, body })
    const profileId = pathname.split('/profiles/')[1]
    if (pathname.endsWith('/members')) return json(200, state.members)
    if (pathname.endsWith('/profiles')) {
      if (method === 'POST') {
        const created = {
          id: `new-${state.profiles.length}`,
          trip_id: 'x',
          user_sub: null,
          weight: 1,
          age_group: 'child',
          segment_km: 1,
          daily_km: 4,
          active_min: 300,
          stairs_sensitivity: 0.6,
          queue_patience_min: 15,
          nap_start: '13:00:00',
          nap_minutes: 60,
          floor: 30,
          customized_fields: [],
          ...(body as object),
        }
        state.profiles.push(created)
        return json(201, created)
      }
      if (state.listStatus) return json(state.listStatus, { detail: 'boom' })
      return json(200, state.profiles)
    }
    if (profileId) {
      const index = state.profiles.findIndex((p) => p.id === profileId)
      if (method === 'DELETE') {
        if (state.deleteStatus) return json(state.deleteStatus, { detail: 'has account' })
        state.profiles.splice(index, 1)
        return new Response(null, { status: 204 })
      }
      const patched = {
        ...state.profiles[index],
        ...(body as object),
        customized_fields: Object.keys(body as object).filter((k) => k !== 'display_name'),
      }
      state.profiles[index] = patched
      return json(200, patched)
    }
    return json(200, state.trip)
  }
  return state
})

// jsdom has no matchMedia; "matches" makes it the desktop layout, i.e. a dialog.
window.matchMedia = (query: string) =>
  ({
    matches: true,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }) as unknown as MediaQueryList

const trip = (role: Trip['my_role']): Trip =>
  ({
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
  }) as Trip

const profile = (id: string, display_name: string, age: number, user_sub: string | null) =>
  ({
    id,
    trip_id: TRIP_ID,
    display_name,
    age,
    age_group: age < 13 ? 'child' : 'adult',
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
    customized_fields: [],
  }) as Profile & Record<string, unknown>

function setup(role: Trip['my_role'], profiles: Profile[] = [], members: Member[] = []) {
  api.trip = trip(role)
  api.profiles = profiles as unknown as Record<string, unknown>[]
  api.members = members
}

function renderPeople() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/trips/${TRIP_ID}?tab=people`] }),
    context: { queryClient },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const calls = (method: string): Call[] => api.calls.filter((c) => c.method === method)

beforeEach(() => {
  api.deleteStatus = null
  api.listStatus = null
  api.calls = []
})

afterEach(() => {
  cleanup()
  queryClient.clear()
})

describe('TripPeopleView', () => {
  it('adds a person: POST with name and age, then the refetched list shows them', async () => {
    setup('host')
    renderPeople()
    const [add] = await screen.findAllByRole('button', { name: m.people_add() })
    if (!add) throw new Error('no add button')
    await userEvent.click(add)
    await userEvent.type(screen.getByLabelText(m.people_form_name_label()), 'Kasia')
    await userEvent.type(screen.getByLabelText(m.people_form_age_label()), '6')
    await userEvent.click(screen.getByRole('button', { name: m.people_form_add_submit() }))

    expect(await screen.findByText('Kasia')).toBeTruthy()
    expect(calls('POST')).toHaveLength(1)
    expect(calls('POST')[0]?.body).toEqual({ display_name: 'Kasia', age: 6 })
    expect(screen.getByText(m.people_source_default())).toBeTruthy()
  })

  it('edits a person: PATCH carries only the changed fields and the chip says what changed', async () => {
    setup('host', [profile(KASIA_ID, 'Kasia', 6, null)])
    renderPeople()
    await userEvent.click(
      await screen.findByRole('button', { name: m.people_edit_label({ name: 'Kasia' }) }),
    )
    const daily = screen.getByLabelText(m.people_form_daily_label())
    await userEvent.clear(daily)
    await userEvent.type(daily, '6')
    await userEvent.click(screen.getByRole('button', { name: m.people_form_edit_submit() }))

    await waitFor(() => expect(calls('PATCH')).toHaveLength(1))
    expect(calls('PATCH')[0]?.body).toEqual({ daily_km: 6 })
    expect(
      await screen.findByText(
        m.people_source_changed({ fields: m.people_walk_label().toLowerCase() }),
      ),
    ).toBeTruthy()
  })

  it('removes a person after a confirmation', async () => {
    setup('host', [profile(KASIA_ID, 'Kasia', 6, null)])
    renderPeople()
    await userEvent.click(
      await screen.findByRole('button', { name: m.people_edit_label({ name: 'Kasia' }) }),
    )
    await userEvent.click(screen.getByRole('button', { name: m.people_delete() }))
    expect(calls('DELETE')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: m.people_delete_yes() }))

    await waitFor(() => expect(screen.queryByText('Kasia')).toBeNull())
    expect(calls('DELETE')).toHaveLength(1)
    expect(await screen.findByText(m.people_empty_title())).toBeTruthy()
  })

  it('keeps the dialog open and explains a 409 when the person has an account', async () => {
    setup('host', [profile(KASIA_ID, 'Kasia', 6, null)])
    api.deleteStatus = 409
    renderPeople()
    await userEvent.click(
      await screen.findByRole('button', { name: m.people_edit_label({ name: 'Kasia' }) }),
    )
    await userEvent.click(screen.getByRole('button', { name: m.people_delete() }))
    await userEvent.click(screen.getByRole('button', { name: m.people_delete_yes() }))

    expect(await screen.findByText(m.people_error_has_account())).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getAllByText('Kasia').length).toBeGreaterThan(0)
  })

  it('gives a member the list without add or edit buttons', async () => {
    setup(
      'member',
      [profile(KASIA_ID, 'Kasia', 6, null), profile(OLA_ID, 'Ola', 34, 'sub|1')],
      [{ profile_id: OLA_ID, display_name: 'Ola', role: 'host', is_me: false }],
    )
    renderPeople()
    const list = await screen.findByRole('list', { name: m.people_list_label() })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: m.people_add() })).toBeNull()
    expect(within(list).queryAllByRole('button')).toHaveLength(0)
  })

  it('shows every comfort value of a person and the hosts first', async () => {
    setup(
      'host',
      [profile(KASIA_ID, 'Kasia', 6, null), profile(OLA_ID, 'Ola', 34, 'sub|1')],
      [{ profile_id: OLA_ID, display_name: 'Ola', role: 'host', is_me: true }],
    )
    renderPeople()
    const list = await screen.findByRole('list', { name: m.people_list_label() })
    const [first, second] = within(list).getAllByRole('listitem')
    if (!first || !second) throw new Error('expected two people')
    expect(first.textContent).toContain('Ola')
    for (const label of [
      m.people_walk_label(),
      m.people_active_label(),
      m.people_nap_label(),
      m.people_stairs_label(),
      m.people_queue_label(),
      m.people_floor_label(),
    ]) {
      expect(within(second).getByText(label)).toBeTruthy()
    }
    // The host profile has an account: no edit button.
    expect(within(first).queryAllByRole('button')).toHaveLength(0)
  })

  it('says so when the profiles cannot be loaded', async () => {
    setup('host')
    api.listStatus = 500
    renderPeople()
    expect(
      await screen.findByText(m.people_load_failed_title(), {}, { timeout: 5000 }),
    ).toBeTruthy()
  })
})
