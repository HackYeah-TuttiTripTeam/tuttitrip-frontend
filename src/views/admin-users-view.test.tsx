// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { resetDemoSessionForTests, setDemoSession } from '@/lib/demo-session'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 5000 })
vi.setConfig({ testTimeout: 20_000 })

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
afterEach(resetDemoSessionForTests)

// The account menu lists its entries only for a signed-in person; the demo session is one.
const openAccountMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  setDemoSession('demo-access', 3600, 'inv')
  renderApp('/trips')
  await user.click(
    (
      await screen.findAllByRole('button', { name: new RegExp(m.demo_account_name()) })
    )[0] as HTMLElement,
  )
}

const rows = () => screen.getAllByRole('row').length - 1 // minus the header row
const actionsOf = (email: string) =>
  within(screen.getByText(email).closest('tr') as HTMLElement).getByRole('button', {
    name: new RegExp(m.admin_users_actions_label({ name: email })),
  })

function recordCalls() {
  const calls: { method: string; path: string }[] = []
  server.events.on('request:start', ({ request }) => {
    calls.push({ method: request.method, path: decodeURIComponent(new URL(request.url).pathname) })
  })
  return calls
}

describe('admin users', () => {
  it('sends someone without admin.users back to the trips', async () => {
    const { router } = renderApp('/admin/users')
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'))
  })

  it('does not offer the panel in the menu to a plain user', async () => {
    const user = userEvent.setup()
    await openAccountMenu(user)
    await screen.findByRole('menuitem', { name: m.account_settings_link() })
    expect(screen.queryByRole('menuitem', { name: m.admin_users_link() })).toBeNull()
  })

  it('offers the panel in the menu to an administrator', async () => {
    useScenario('admin')
    const user = userEvent.setup()
    await openAccountMenu(user)
    expect(await screen.findByRole('menuitem', { name: m.admin_users_link() })).toBeTruthy()
  })

  it('lists the first page of accounts for an administrator', async () => {
    useScenario('admin')
    renderApp('/admin/users')
    expect(await screen.findByText(m.list_range({ from: 1, to: 20, total: 23 }))).toBeTruthy()
    expect(rows()).toBe(20)
    expect(screen.getByText('osoba22@example.com')).toBeTruthy()
    // every seventh account is blocked
    expect(screen.getAllByText(m.admin_users_status_blocked()).length).toBeGreaterThan(0)
  })

  it('finds an account by e-mail, keeping the search in the URL', async () => {
    useScenario('admin')
    const user = userEvent.setup()
    const { router } = renderApp('/admin/users')
    await screen.findByText(m.list_range({ from: 1, to: 20, total: 23 }))

    await user.type(
      screen.getByRole('searchbox', { name: m.admin_users_search_label() }),
      'osoba05',
    )
    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: 'osoba05' }))
    expect(await screen.findByText(m.admin_users_count({ count: 1 }))).toBeTruthy()
    expect(screen.getByText('osoba05@example.com')).toBeTruthy()
  })

  it('reads the blocked filter from a pasted URL', async () => {
    useScenario('admin')
    renderApp('/admin/users?blocked=true')
    expect(await screen.findByText(m.admin_users_count({ count: 3 }))).toBeTruthy()
    expect(
      screen
        .getByRole('radio', { name: m.admin_users_status_blocked() })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('lets a read-only administrator look but not change anything', async () => {
    useScenario('admin-read-only')
    renderApp('/admin/users')
    await screen.findByText('osoba22@example.com')
    expect(
      screen.queryByRole('button', { name: new RegExp(m.admin_users_actions_label({ name: '' })) }),
    ).toBeNull()
  })

  it('asks before blocking, then blocks', async () => {
    useScenario('admin')
    const calls = recordCalls()
    const user = userEvent.setup()
    renderApp('/admin/users')
    await screen.findByText('osoba22@example.com')

    await user.click(actionsOf('osoba22@example.com'))
    await user.click(await screen.findByRole('menuitem', { name: m.admin_users_action_block() }))
    const dialog = await screen.findByRole('dialog')
    expect(calls.some((call) => call.method === 'POST')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: m.admin_users_block_confirm() }))

    await waitFor(() =>
      expect(
        calls.some(
          (call) => call.method === 'POST' && call.path.endsWith('/google-oauth2|user-22/block'),
        ),
      ).toBe(true),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('unblocks without a dialog', async () => {
    useScenario('admin')
    const calls = recordCalls()
    const user = userEvent.setup()
    renderApp('/admin/users?q=osoba06')
    await screen.findByText('osoba06@example.com')
    await user.click(actionsOf('osoba06@example.com'))
    await user.click(await screen.findByRole('menuitem', { name: m.admin_users_action_unblock() }))
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'DELETE' && call.path.endsWith('/block'))).toBe(
        true,
      ),
    )
  })

  it('makes the administrator type the e-mail before deleting', async () => {
    useScenario('admin')
    const calls = recordCalls()
    const user = userEvent.setup()
    renderApp('/admin/users?q=osoba03')
    await screen.findByText('osoba03@example.com')

    await user.click(actionsOf('osoba03@example.com'))
    await user.click(await screen.findByRole('menuitem', { name: m.admin_users_action_delete() }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: m.admin_users_delete_confirm() })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)

    await user.type(
      within(dialog).getByLabelText(m.admin_users_delete_type_label()),
      'osoba03@example.co',
    )
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    await user.type(within(dialog).getByLabelText(m.admin_users_delete_type_label()), 'm')
    expect((confirm as HTMLButtonElement).disabled).toBe(false)
    await user.click(confirm)

    await waitFor(() => expect(screen.queryByText('osoba03@example.com')).toBeNull())
    expect(
      calls.some((call) => call.method === 'DELETE' && call.path.endsWith('/auth0|user-3')),
    ).toBe(true)
  })
})
