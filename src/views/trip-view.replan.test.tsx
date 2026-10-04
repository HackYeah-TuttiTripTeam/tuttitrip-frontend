// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The jobs are polled every 2 s, so a full flow takes a few seconds.
vi.setConfig({ testTimeout: 40_000 })
configure({ asyncUtilTimeout: 15_000 })

// Dialogs instead of drawers: simpler in jsdom.
const realMatchMedia = window.matchMedia
beforeAll(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
})
afterAll(() => {
  window.matchMedia = realMatchMedia
})

const open = () => renderApp(`/trips/${TRIP_ID}?tab=plan`)
const rainButton = async () =>
  (await screen.findAllByRole('button', { name: m.replan_rain() }))[0] as HTMLElement

describe('rain button', () => {
  it('shows the new rest of the day with was and is', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    await user.click(await rainButton())
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(m.replan_applied())).toBeTruthy()
    expect(within(dialog).getByText('Centrum Nauki Kopernik')).toBeTruthy()
    expect(within(dialog).getByText(m.replan_affects({ names: 'Babcia Halina' }))).toBeTruthy()
  })

  it('tells a member that the change waits for the host', async () => {
    useScenario('member-readonly')
    const user = userEvent.setup()
    open()
    await user.click(await rainButton())
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(m.replan_waiting_for_host())).toBeTruthy()
  })

  it('shows an error without a network', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    const button = await rainButton()
    server.use(http.post('*/api/v1/trips/:tripId/plans/:planId/replan', () => HttpResponse.error()))
    await user.click(button)
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(m.replan_failed_offline())).toBeTruthy()
  })
})

describe('approvals of the host', () => {
  it('lists the changes of members and applies an approval', async () => {
    useScenario('replan-pending')
    const user = userEvent.setup()
    open()
    const section = await screen.findByRole('region', {
      name: m.replan_pending_title({ count: 1 }),
    })
    expect(within(section).getByText(m.replan_affects({ names: 'Babcia Halina' }))).toBeTruthy()
    await user.click(within(section).getByRole('button', { name: m.replan_approve() }))
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: m.replan_pending_title({ count: 1 }) }),
      ).toBeNull(),
    )
  })

  it('drops a rejected change from the list', async () => {
    useScenario('replan-pending')
    const user = userEvent.setup()
    open()
    const section = await screen.findByRole('region', {
      name: m.replan_pending_title({ count: 1 }),
    })
    await user.click(within(section).getByRole('button', { name: m.replan_reject() }))
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: m.replan_pending_title({ count: 1 }) }),
      ).toBeNull(),
    )
  })

  it('does not ask a plain member for approvals', async () => {
    useScenario('member-readonly', {
      tweak: (world) => {
        world.replans = []
      },
    })
    open()
    await rainButton()
    expect(screen.queryByRole('region', { name: m.replan_pending_title({ count: 1 }) })).toBeNull()
  })
})
