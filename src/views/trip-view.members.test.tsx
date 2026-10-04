// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 5000 })

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

const openMembers = () => renderApp(`/trips/${TRIP_ID}?tab=members`)
const row = async (name: string) =>
  within(await screen.findByRole('list', { name: m.members_list_label() }))
    .getByText(name)
    .closest('li') as HTMLElement
const actionsOf = (li: HTMLElement) =>
  within(li).queryByRole('button', { name: new RegExp(m.members_actions_label({ name: '' })) })

function recordCalls() {
  const calls: { method: string; path: string; body: unknown }[] = []
  server.events.on('request:start', async ({ request }) => {
    calls.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: await request
        .clone()
        .json()
        .catch(() => null),
    })
  })
  return calls
}

describe('members tab', () => {
  it('lists members with role and participation status', async () => {
    openMembers()
    const babcia = await row('Babcia Halina')
    expect(within(babcia).getByText(m.trip_role_member())).toBeTruthy()
    expect(within(babcia).getByText(m.members_status_pending())).toBeTruthy()
    const marek = await row('Marek')
    expect(within(marek).getByText(m.trip_role_co_host())).toBeTruthy()
    expect(within(marek).getByText(m.members_status_confirmed())).toBeTruthy()
  })

  it('gives the host actions on others and none on themselves, and no leave button', async () => {
    openMembers()
    expect(actionsOf(await row('Marek'))).toBeTruthy()
    expect(actionsOf(await row('Babcia Halina'))).toBeTruthy()
    expect(actionsOf(await row('Ola'))).toBeNull()
    expect(screen.queryByRole('button', { name: m.membership_leave() })).toBeNull()
    expect(screen.getByText(m.membership_host_body())).toBeTruthy()
  })

  it('lets the host give the co-host role and refreshes the list', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    openMembers()
    await user.click(actionsOf(await row('Babcia Halina')) as HTMLElement)
    await user.click(await screen.findByRole('menuitem', { name: m.members_action_make_co_host() }))

    await waitFor(() =>
      expect(
        within(screen.getByText('Babcia Halina').closest('li') as HTMLElement).getByText(
          m.trip_role_co_host(),
        ),
      ).toBeTruthy(),
    )
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ role: 'co_host' })
  })

  it('asks before removing a member and sends nothing when the host cancels', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    openMembers()
    await user.click(actionsOf(await row('Babcia Halina')) as HTMLElement)
    await user.click(await screen.findByRole('menuitem', { name: m.members_action_remove() }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(m.members_remove_title({ name: 'Babcia Halina' }))).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: m.action_cancel() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)

    await user.click(actionsOf(await row('Babcia Halina')) as HTMLElement)
    await user.click(await screen.findByRole('menuitem', { name: m.members_action_remove() }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: m.members_remove_confirm(),
      }),
    )
    await waitFor(() => expect(screen.queryByText('Babcia Halina')).toBeNull())
  })

  it('transfers the host role after a confirmation', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    openMembers()
    await user.click(actionsOf(await row('Marek')) as HTMLElement)
    await user.click(
      await screen.findByRole('menuitem', { name: m.members_action_transfer_host() }),
    )
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: m.members_transfer_confirm(),
      }),
    )
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'POST' && call.path.endsWith('/host'))).toBe(
        true,
      ),
    )
    // The caller is a co-host now: the leave button appears, the host note is gone.
    expect(await screen.findByRole('button', { name: m.membership_leave() })).toBeTruthy()
  })

  it('shows a co-host no action on the host or on other co-hosts', async () => {
    useScenario('cohost')
    openMembers()
    expect(actionsOf(await row('Marek'))).toBeNull() // the host
    expect(actionsOf(await row('Babcia Halina'))).toBeTruthy() // a plain member: removal only
    const user = userEvent.setup()
    await user.click(actionsOf(await row('Babcia Halina')) as HTMLElement)
    expect(await screen.findByRole('menuitem', { name: m.members_action_remove() })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: m.members_action_make_co_host() })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: m.members_action_transfer_host() })).toBeNull()
  })

  it('shows a plain member only confirm and leave', async () => {
    useScenario('member-pending')
    openMembers()
    await screen.findByRole('list', { name: m.members_list_label() })
    expect(screen.getByRole('button', { name: m.membership_confirm() })).toBeTruthy()
    expect(screen.getByRole('button', { name: m.membership_leave() })).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: new RegExp(m.members_actions_label({ name: '' })) }),
    ).toBeNull()
  })

  it('confirms participation and drops the pending note', async () => {
    useScenario('member-pending')
    const user = userEvent.setup()
    renderApp(`/trips/${TRIP_ID}`)
    // Another tab: the note above the tabs leads to the members.
    await user.click(await screen.findByRole('button', { name: m.membership_pending_open() }))
    await user.click(await screen.findByRole('button', { name: m.membership_confirm() }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: m.membership_confirm() })).toBeNull(),
    )
    expect(screen.getByText(m.membership_confirmed_title())).toBeTruthy()
  })

  it('asks before leaving, then goes back to the list without the trip', async () => {
    useScenario('member-pending')
    const user = userEvent.setup()
    const { router } = openMembers()
    await user.click(await screen.findByRole('button', { name: m.membership_leave() }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: m.membership_leave_confirm() }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'))
  })
})
