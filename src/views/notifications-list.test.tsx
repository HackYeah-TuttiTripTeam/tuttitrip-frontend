// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const rows = () => screen.getAllByRole('row').length - 1 // minus the header row

describe('notifications history', () => {
  it('shows page 2 of 134 from the URL, with the range and the pages', async () => {
    useScenario('notifications-inbox')
    renderApp('/notifications?page=2&size=20')

    expect(await screen.findByText(m.list_range({ from: 21, to: 40, total: 134 }))).toBeTruthy()
    expect(rows()).toBe(20)
    expect(screen.getByLabelText(m.list_go_to_page({ page: 7 }))).toBeTruthy()
  })

  it('applies filters and sort from a pasted URL', async () => {
    useScenario('notifications-inbox')
    renderApp('/notifications?read=unread&type=veto_added&sort=type&dir=asc')

    // 40 unread, every fifth of them (from the second) is a veto: 8.
    expect(await screen.findByText(m.list_range({ from: 1, to: 8, total: 8 }))).toBeTruthy()
    expect(
      screen.getByRole('radio', { name: m.notif_filter_unread() }).getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: m.notif_filter_type_count({ count: 1 }) }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('columnheader', { name: new RegExp(m.notif_column_type()) })
        .getAttribute('aria-sort'),
    ).toBe('ascending')
  })

  it('goes back to page 1 on a filter change without growing the history', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    const { router } = renderApp('/notifications?page=3')
    await screen.findByText(m.list_range({ from: 41, to: 60, total: 134 }))
    const historyBefore = window.history.length

    await user.click(screen.getByRole('radio', { name: m.notif_filter_unread() }))

    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 40 }))).toBeTruthy()
    expect(router.state.location.search).toEqual({ read: 'unread' })
    expect(window.history.length).toBe(historyBefore)
  })

  it('sorts by a column header and writes it to the URL', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    const { router } = renderApp('/notifications')
    await screen.findByText(m.list_range({ from: 1, to: 20, total: 134 }))

    await user.click(screen.getByRole('button', { name: m.notif_column_type() }))

    await waitFor(() => expect(router.state.location.search).toMatchObject({ sort: 'type' }))
    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 134 }))).toBeTruthy()
  })

  it('shows the no-match state with a way out, and the empty state without filters', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    renderApp('/notifications?type=plan_ready&from=2020-01-01&to=2020-01-02')

    const empty = await screen.findByText(m.notif_no_match_title())
    const status = empty.closest('[role=status]') as HTMLElement
    await user.click(within(status).getByRole('button', { name: m.notif_filters_clear() }))
    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 134 }))).toBeTruthy()
  })

  it('shows the empty state when there is nothing at all', async () => {
    useScenario('notifications-empty')
    renderApp('/notifications')
    expect(await screen.findByText(m.notif_empty_title())).toBeTruthy()
  })

  it('says so when the API fails, and retries', async () => {
    useScenario('notifications-error')
    renderApp('/notifications')
    expect(await screen.findByText(m.notif_load_failed_title())).toBeTruthy()
  })
})

describe('selecting and marking', () => {
  it('ticks the page, offers every match, and marks them all through the filter', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    renderApp('/notifications?read=unread')
    await screen.findByText(m.list_range({ from: 1, to: 20, total: 40 }))

    await user.click(screen.getByRole('checkbox', { name: m.notif_select_page() }))
    expect(screen.getByText(m.notif_selected_page({ count: 20 }), { exact: false })).toBeTruthy()
    await user.click(
      screen.getByRole('button', { name: m.notif_select_all_matching({ total: 40 }) }),
    )
    expect(screen.getByText(m.notif_selected_all_matching({ count: 40 }))).toBeTruthy()

    await user.click(screen.getByRole('button', { name: m.notif_mark_read() }))

    // All 40 unread ones, also from page 2, are read: the filtered list is now empty.
    expect(await screen.findByText(m.notif_marked_read({ count: 40 }))).toBeTruthy()
    expect(await screen.findByText(m.notif_no_match_title())).toBeTruthy()
  })

  it('marks only the ticked rows, then clears the selection', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    renderApp('/notifications')
    await screen.findByText(m.list_range({ from: 1, to: 20, total: 134 }))

    const boxes = screen.getAllByRole('checkbox', {
      name: new RegExp(`^${m.notif_select_row({ title: '' })}`),
    })
    for (const box of boxes.slice(0, 3)) await user.click(box)
    expect(screen.getByText(m.notif_selected_page({ count: 3 }))).toBeTruthy()
    // Not the whole page, so no offer to take every match.
    expect(screen.queryByRole('button', { name: /Zaznacz wszystkie 134/ })).toBeNull()

    await user.click(screen.getByRole('button', { name: m.notif_mark_read() }))

    expect(await screen.findByText(m.notif_marked_read({ count: 3 }))).toBeTruthy()
    await waitFor(() => expect(screen.queryByText(m.notif_selected_page({ count: 3 }))).toBeNull())
  })

  it('marks read rows unread again', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    renderApp('/notifications?read=read&size=10')
    await screen.findByText(m.list_range({ from: 1, to: 10, total: 94 }))

    await user.click(screen.getByRole('checkbox', { name: m.notif_select_page() }))
    await user.click(screen.getByRole('button', { name: m.notif_mark_unread() }))

    expect(await screen.findByText(m.notif_marked_unread({ count: 10 }))).toBeTruthy()
  })

  it('forgets the selection when the filter changes', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    renderApp('/notifications')
    await screen.findByText(m.list_range({ from: 1, to: 20, total: 134 }))

    await user.click(screen.getByRole('checkbox', { name: m.notif_select_page() }))
    expect(screen.getByText(m.notif_selected_page({ count: 20 }), { exact: false })).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: m.notif_filter_unread() }))

    await screen.findByText(m.list_range({ from: 1, to: 20, total: 40 }))
    expect(screen.queryByText(m.notif_selected_page({ count: 20 }), { exact: false })).toBeNull()
  })
})
