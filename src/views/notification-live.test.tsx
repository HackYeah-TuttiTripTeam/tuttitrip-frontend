// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDemoSessionForTests, setDemoSession } from '@/lib/demo-session'
import { TRIP_ID } from '@/mocks/fixtures'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'
import { useNotificationStore } from '@/stores/notification-store'

beforeEach(() => {
  // Toasts live in a module-level store: one from the previous test would keep a dead handler.
  toast.dismiss()
  resetDemoSessionForTests()
  setDemoSession('token', 3600, 'invitation')
  useNotificationStore.setState({ streamStatus: 'connecting' })
})

const bell = (count: number) =>
  screen.findByRole(
    'button',
    { name: m.notif_bell_label_unread({ count }), hidden: true },
    { timeout: 5000 },
  )

// Live tests wait for timers of the mock stream, and the first render in a worker is slow.
const SLOW = 20_000

describe('live notifications', () => {
  it(
    'opens the stream and keeps quiet until something arrives',
    async () => {
      useScenario('notifications-inbox')
      renderApp('/trips')
      await bell(40)
      await waitFor(() => expect(useNotificationStore.getState().streamStatus).toBe('open'), {
        timeout: 5000,
      })
    },
    SLOW,
  )

  it(
    'shows a toast with the action and a "later" button, and grows the badge',
    async () => {
      useScenario('notifications-live', { tweak: (world) => (world.notificationLiveEveryMs = 150) })
      renderApp('/trips')

      expect(
        await screen.findByText(m.notif_proposal_waiting_title(), {}, { timeout: 5000 }),
      ).toBeTruthy()
      expect(screen.getByRole('button', { name: m.notif_action_open_plan() })).toBeTruthy()
      expect(screen.getByRole('button', { name: m.notif_toast_details() })).toBeTruthy()
      // 3 unread at the start of the default world, plus the live one(s).
      expect(
        await screen.findByRole('button', {
          name: /Powiadomienia, nieprzeczytane: [4-9]/,
          hidden: true,
        }),
      ).toBeTruthy()
    },
    SLOW,
  )

  it(
    'opens the plan from the toast and reads the notification',
    async () => {
      useScenario('notifications-live', {
        tweak: (world) => (world.notificationLiveEveryMs = 1500),
      })
      const user = userEvent.setup()
      const { router } = renderApp('/trips')

      await user.click(
        await screen.findByRole('button', { name: m.notif_action_open_plan() }, { timeout: 5000 }),
      )

      await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`), {
        timeout: 5000,
      })
      expect(router.state.location.search).toMatchObject({ tab: 'plan' })
    },
    SLOW,
  )

  it(
    'falls back to polling when the stream is down',
    async () => {
      useScenario('notifications-stream-down')
      renderApp('/trips')
      await bell(3)
      await waitFor(() => expect(useNotificationStore.getState().streamStatus).toBe('polling'), {
        timeout: 5000,
      })
    },
    SLOW,
  )
})
