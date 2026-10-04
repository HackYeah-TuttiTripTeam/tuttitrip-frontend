// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const rows = () => screen.getAllByRole('row').length - 1 // minus the header row

describe('trips list', () => {
  it('shows the first page of 45 and moves on with the next button', async () => {
    useScenario('many-trips')
    const user = userEvent.setup()
    const { router } = renderApp('/trips')

    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 45 }))).toBeTruthy()
    expect(rows()).toBe(20)

    await user.click(screen.getByRole('button', { name: m.list_next() }))
    expect(await screen.findByText(m.list_range({ from: 21, to: 40, total: 45 }))).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ page: 2 })
  })

  it('reads page, sort and filters from a pasted URL', async () => {
    useScenario('many-trips')
    renderApp('/trips?role=host&sort=start_date&dir=asc&page=2&size=10')

    // 15 hosts at 10 per page: page 2 holds 5 of them.
    expect(await screen.findByText(m.list_range({ from: 11, to: 15, total: 15 }))).toBeTruthy()
    expect(rows()).toBe(5)
    const host = screen.getByRole('button', { name: m.trip_role_host() })
    expect(host.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('combobox', { name: m.trips_sort_by() }).textContent).toBe(
      m.trip_sort_start_date(),
    )
  })

  it('falls back to defaults for nonsense params', async () => {
    useScenario('many-trips')
    const { router } = renderApp('/trips?page=abc&size=7&dir=up&role=boss')
    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 45 }))).toBeTruthy()
    expect(router.state.location.search).toEqual({})
  })

  it('moves a page past the end to the last page', async () => {
    useScenario('many-trips')
    const { router } = renderApp('/trips?page=9')
    expect(await screen.findByText(m.list_range({ from: 41, to: 45, total: 45 }))).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ page: 3 })
  })

  it('searches on the server after typing stops and goes back to page 1', async () => {
    useScenario('many-trips')
    const user = userEvent.setup()
    const { router } = renderApp('/trips?page=2')
    await screen.findByText(m.list_range({ from: 21, to: 40, total: 45 }))
    const historyBefore = window.history.length

    await user.type(screen.getByRole('searchbox', { name: m.trips_search_label() }), 'Toruń')

    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: 'Toruń' }))
    expect(router.state.location.search).not.toHaveProperty('page')
    // 9 of the 45 names are Toruń.
    expect(await screen.findByText(m.trips_count({ count: 9 }))).toBeTruthy()
    expect(window.history.length).toBe(historyBefore)
  })

  it('shows the no-match state and clears the filters', async () => {
    useScenario('many-trips')
    const user = userEvent.setup()
    const { router } = renderApp('/trips?q=zzzz')

    const empty = await screen.findByText(m.trips_no_match_title())
    expect(empty).toBeTruthy()
    const status = empty.closest('[role=status]') as HTMLElement
    await user.click(within(status).getByRole('button', { name: m.trips_filters_clear() }))

    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 45 }))).toBeTruthy()
    expect(router.state.location.search).toEqual({})
  })

  it('keeps the empty state for an account without trips', async () => {
    useScenario('family-warsaw')
    renderApp('/trips?kind=outing')
    expect(await screen.findByText(/Niedzielny spacer|Sunday/)).toBeTruthy()
  })

  it('sends several roles as repeated role params', async () => {
    useScenario('many-trips')
    const seen: string[][] = []
    server.use(
      http.get('*/api/v1/trips', ({ request }) => {
        seen.push(new URL(request.url).searchParams.getAll('role'))
        return HttpResponse.json({ items: [], total: 0, page: 1, size: 20, pages: 0 })
      }),
    )
    renderApp('/trips?role=%5B%22host%22%2C%22member%22%5D')
    await waitFor(() => expect(seen.length).toBeGreaterThan(0))
    expect(seen[0]).toEqual(['host', 'member'])
  })

  it('does not send an inverted date range', async () => {
    useScenario('many-trips')
    const { router } = renderApp('/trips?start_from=2026-11-10&start_to=2026-11-01')
    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 27 }))).toBeTruthy()
    expect(router.state.location.search).toEqual({ start_from: '2026-11-10' })
  })

  it('shows the skeleton, not an empty table, for a page past the end', async () => {
    useScenario('many-trips')
    renderApp('/trips?page=9')
    expect(screen.queryByText(m.trips_no_match_title())).toBeNull()
    expect(await screen.findByText(m.list_range({ from: 41, to: 45, total: 45 }))).toBeTruthy()
  })
})
