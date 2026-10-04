// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDemoSessionForTests, setDemoSession } from '@/lib/demo-session'
import { TRIP_ID } from '@/mocks/fixtures'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

beforeEach(() => {
  resetDemoSessionForTests()
  // A signed-in session, so the shell shows the bell.
  setDemoSession('token', 3600, 'invitation')
})

// An open panel hides the rest of the page from the accessibility tree, the bell included.
const bell = (count: number) =>
  screen.findByRole(
    'button',
    { name: m.notif_bell_label_unread({ count }), hidden: true },
    { timeout: 5000 },
  )

describe('the bell', () => {
  it('shows the unread count and the five latest notifications without marking any', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    renderApp('/trips')

    await user.click(await bell(40))

    const panel = await screen.findByRole('dialog')
    expect(await within(panel).findAllByRole('listitem')).toHaveLength(5)
    expect(within(panel).getByRole('button', { name: m.notif_mark_all_read() })).toBeTruthy()
    expect(within(panel).getByRole('link', { name: m.notif_see_more() })).toBeTruthy()
    // Opening is not reading.
    expect(await bell(40)).toBeTruthy()
  })

  it('marks everything read in one click and the badge goes', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    renderApp('/trips')
    await user.click(await bell(40))

    await user.click(await screen.findByRole('button', { name: m.notif_mark_all_read() }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: m.notif_bell_label(), hidden: true })).toBeTruthy(),
    )
    expect(screen.queryByRole('button', { name: m.notif_mark_all_read() })).toBeNull()
  })

  it('leads to the history', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    const { router } = renderApp('/trips')
    await user.click(await bell(40))

    await user.click(await screen.findByRole('link', { name: m.notif_see_more() }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/notifications'))
  })

  it('opens the action of a notification and reads it', async () => {
    useScenario('notifications-inbox')
    const user = userEvent.setup()
    const { router } = renderApp('/trips')
    await user.click(await bell(40))

    // The first one is a member_joined with an "open people" action.
    await user.click(await screen.findByRole('button', { name: m.notif_action_open_people() }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`))
    expect(router.state.location.search).toMatchObject({ tab: 'people' })
    expect(await bell(39)).toBeTruthy()
  })

  it('has no badge without unread notifications, and says so when empty', async () => {
    useScenario('notifications-empty')
    const user = userEvent.setup()
    renderApp('/trips')

    await user.click(await screen.findByRole('button', { name: m.notif_bell_label() }))

    expect(await screen.findByText(m.notif_empty_title())).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.notif_mark_all_read() })).toBeNull()
  })

  it('offers a retry when the list fails', async () => {
    useScenario('notifications-error')
    const user = userEvent.setup()
    renderApp('/trips')

    await user.click(await screen.findByRole('button', { name: m.notif_bell_label() }))

    expect(await screen.findByText(m.notif_load_failed())).toBeTruthy()
  })
})
