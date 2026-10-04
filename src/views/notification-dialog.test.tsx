// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDemoSessionForTests, setDemoSession } from '@/lib/demo-session'
import { notifications, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const SLOW = 20_000
const FIRST = notifications(134, 40)[0]
const FAR = notifications(134, 40)[120] // read, far beyond the first page: fetched by id

beforeEach(() => {
  resetDemoSessionForTests()
  setDemoSession('token', 3600, 'invitation')
})

const rowButton = (title: string, nth = 0) =>
  screen
    .findAllByRole('button', { name: new RegExp(title) }, { timeout: 5000 })
    .then((all) => all[nth] as HTMLElement)

describe('notification dialog', () => {
  it(
    'opens from a row with the full content, puts the id in the URL and reads it',
    async () => {
      useScenario('notifications-inbox')
      const user = userEvent.setup()
      const { router } = renderApp('/notifications')

      await user.click(await rowButton(m.notif_member_joined_title()))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText(m.notif_member_joined_body({ name: 'Anna' }))).toBeTruthy()
      expect(
        within(dialog).getByText(m.notif_dialog_trip({ trip: 'Warszawa z rodziną' })),
      ).toBeTruthy()
      expect(
        within(dialog).getByRole('button', { name: m.notif_action_open_people() }),
      ).toBeTruthy()
      expect(router.state.location.search).toMatchObject({ open: FIRST?.id })
      // Reading it: the counter of the bell drops from 40.
      expect(
        await screen.findByRole(
          'button',
          { name: m.notif_bell_label_unread({ count: 39 }), hidden: true },
          { timeout: 5000 },
        ),
      ).toBeTruthy()
    },
    SLOW,
  )

  it(
    'closes with Escape and gives the focus back to the row',
    async () => {
      useScenario('notifications-inbox')
      const user = userEvent.setup()
      const { router } = renderApp('/notifications')
      const row = await rowButton(m.notif_member_joined_title())

      await user.click(row)
      await screen.findByRole('dialog')
      await user.keyboard('{Escape}')

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(router.state.location.search).not.toHaveProperty('open')
      await waitFor(() => expect(document.activeElement).toBe(row))
    },
    SLOW,
  )

  it(
    'opens from the keyboard',
    async () => {
      useScenario('notifications-inbox')
      const user = userEvent.setup()
      renderApp('/notifications')
      const row = await rowButton(m.notif_member_joined_title())

      row.focus()
      await user.keyboard('{Enter}')

      expect(await screen.findByRole('dialog')).toBeTruthy()
    },
    SLOW,
  )

  it(
    'runs an action from the dialog: opens the trip tab and reads the notification',
    async () => {
      useScenario('notifications-inbox')
      const user = userEvent.setup()
      const { router } = renderApp('/notifications')
      await user.click(await rowButton(m.notif_member_joined_title()))
      const dialog = await screen.findByRole('dialog')

      await user.click(within(dialog).getByRole('button', { name: m.notif_action_open_people() }))

      await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`), {
        timeout: 5000,
      })
      expect(router.state.location.search).toMatchObject({ tab: 'people' })
    },
    SLOW,
  )

  it(
    'marks it unread again from the dialog and does not read it a second time',
    async () => {
      useScenario('notifications-inbox')
      const user = userEvent.setup()
      renderApp('/notifications')
      await user.click(await rowButton(m.notif_member_joined_title()))
      const dialog = await screen.findByRole('dialog')

      await user.click(await within(dialog).findByRole('button', { name: m.notif_mark_unread() }))

      expect(await within(dialog).findByRole('button', { name: m.notif_mark_read() })).toBeTruthy()
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(within(dialog).getByRole('button', { name: m.notif_mark_read() })).toBeTruthy()
    },
    SLOW,
  )

  it(
    'restores the dialog from ?open, also for a notification beyond the first page',
    async () => {
      useScenario('notifications-inbox')
      renderApp(`/notifications?open=${FAR?.id}`)

      const dialog = await screen.findByRole('dialog', {}, { timeout: 5000 })
      expect(within(dialog).getByRole('heading')).toBeTruthy()
      expect(within(dialog).getByRole('button', { name: m.notif_mark_unread() })).toBeTruthy()
    },
    SLOW,
  )

  it(
    'says so for an id that does not exist',
    async () => {
      useScenario('notifications-inbox')
      renderApp(`/notifications?open=${crypto.randomUUID()}`)
      expect(
        await screen.findByText(m.notif_dialog_missing_title(), {}, { timeout: 5000 }),
      ).toBeTruthy()
    },
    SLOW,
  )

  it(
    'puts the row back to unread when marking fails',
    async () => {
      useScenario('notifications-inbox')
      server.use(
        http.post('*/api/v1/notifications/mark', () =>
          HttpResponse.json({ detail: 'boom' }, { status: 500 }),
        ),
      )
      const user = userEvent.setup()
      renderApp('/notifications')
      await user.click(await rowButton(m.notif_member_joined_title()))
      const dialog = await screen.findByRole('dialog')

      // Rolled back: the dialog offers "mark read" again.
      expect(await within(dialog).findByRole('button', { name: m.notif_mark_read() })).toBeTruthy()
    },
    SLOW,
  )

  it(
    'opens from the bell',
    async () => {
      useScenario('notifications-inbox')
      const user = userEvent.setup()
      const { router } = renderApp('/trips')
      await user.click(
        await screen.findByRole(
          'button',
          { name: m.notif_bell_label_unread({ count: 40 }) },
          { timeout: 5000 },
        ),
      )
      const panel = await screen.findByRole('dialog')
      await user.click(
        (
          await within(panel).findAllByRole('button', {
            name: new RegExp(m.notif_member_joined_title()),
          })
        )[0] as HTMLElement,
      )

      await waitFor(() => expect(router.state.location.pathname).toBe('/notifications'), {
        timeout: 5000,
      })
      expect(router.state.location.search).toMatchObject({ open: FIRST?.id })
    },
    SLOW,
  )
})

describe('optimistic marking', () => {
  it(
    'drops the badge before the server has answered, by the rows that were unread',
    async () => {
      useScenario('notifications-inbox')
      server.use(
        http.post('*/api/v1/notifications/mark', async () => {
          await delay(1500)
          return undefined // the scenario's own handler answers
        }),
      )
      const user = userEvent.setup()
      renderApp('/notifications')
      await screen.findAllByRole('checkbox', { name: /^Zaznacz powiadomienie/ }, { timeout: 5000 })
      const boxes = screen.getAllByRole('checkbox', { name: /^Zaznacz powiadomienie/ })
      await user.click(boxes[0] as HTMLElement)
      await user.click(boxes[1] as HTMLElement)
      await user.click(screen.getByRole('button', { name: m.notif_mark_read() }))

      // 40 unread, two marked: the badge shows 38 while the request is still in flight.
      expect(
        await screen.findByRole(
          'button',
          { name: m.notif_bell_label_unread({ count: 38 }), hidden: true },
          { timeout: 1000 },
        ),
      ).toBeTruthy()
    },
    SLOW,
  )
})
