// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fetchClient } from '@/api/client'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The app loads lazily and the machine may be busy: wait longer than the 1 s default.
configure({ asyncUtilTimeout: 8000 })
// jsdom has no pointer capture, which the phone drawer (vaul) calls on press.
Element.prototype.setPointerCapture = () => undefined
Element.prototype.releasePointerCapture = () => undefined
Element.prototype.hasPointerCapture = () => false

const roleButton = (name: string) =>
  screen.findByRole('button', { name: m.perm_role_open({ name }) })
const level = (feature: string, label: string) =>
  screen.findByRole('radio', { name: `${feature}: ${label}` })

describe('permissions panel', { timeout: 30_000 }, () => {
  it('shows nothing of the panel to someone the API does not make an admin', async () => {
    renderApp('/admin/permissions')
    expect(await screen.findByText(m.perm_no_access_title())).toBeTruthy()
    expect(screen.queryByRole('tab', { name: m.perm_tab_roles() })).toBeNull()
    expect(screen.queryByRole('link', { name: m.perm_title() })).toBeNull()
  })

  it('lists the roles for an admin, and the nav link is there', async () => {
    useScenario('admin')
    renderApp('/admin/permissions')
    expect(await roleButton('moderator')).toBeTruthy()
    expect(screen.getByText(m.list_range({ from: 1, to: 3, total: 3 }))).toBeTruthy()
    expect((await screen.findAllByRole('link', { name: m.perm_title() })).length).toBeGreaterThan(0)
  })

  it('gives the user role Read on a leaf, and it is still there after a reload', async () => {
    useScenario('admin')
    const user = userEvent.setup()
    const first = renderApp('/admin/permissions')
    await user.click(await roleButton('user'))
    await user.click(await level('trips.members', m.perm_level_read()))
    await user.click(screen.getByRole('button', { name: m.perm_role_save() }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: m.perm_role_save() })).toBeNull(),
    )

    first.unmount()
    renderApp('/admin/permissions')
    await user.click(await roleButton('user'))
    const row = (await level('trips.members', m.perm_level_read())).closest('li')
    expect(row).toBeTruthy()
    expect(
      within(row as HTMLElement)
        .getByRole('radio', { name: /Odczyt|Read/ })
        .getAttribute('data-state'),
    ).toBe('on')
  })

  it('shows the 403 message when a grant is above what the admin has', async () => {
    useScenario('admin')
    const user = userEvent.setup()
    renderApp('/admin/permissions')
    await user.click(await roleButton('moderator'))
    await user.click(await level('admin', m.perm_level_write()))
    await user.click(screen.getByRole('button', { name: m.perm_role_save() }))
    expect((await screen.findByRole('alert')).textContent).toContain('więcej uprawnień')
  })

  it('opens superadmin without any edit action', async () => {
    useScenario('admin')
    renderApp('/admin/permissions?open=role%3Asuperadmin')
    expect(await screen.findByText(m.perm_role_description_locked())).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.perm_role_save() })).toBeNull()
    expect(screen.queryByRole('button', { name: m.perm_role_delete() })).toBeNull()
    expect((await level('trips', m.perm_level_read())).hasAttribute('disabled')).toBe(true)
  })

  it('is read-only with admin.permissions READ', async () => {
    useScenario('admin-readonly')
    renderApp('/admin/permissions')
    expect(await roleButton('user')).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.perm_role_new() })).toBeNull()
    expect(screen.getByText(m.perm_readonly_note())).toBeTruthy()
  })

  it('assigns and takes back a role for a user, and writes it to the audit', async () => {
    useScenario('admin')
    const user = userEvent.setup()
    const { router } = renderApp('/admin/permissions?tab=users')
    await user.click(
      await screen.findByRole('button', { name: m.perm_user_open({ sub: 'auth0|ola-kowalska' }) }),
    )
    expect(router.state.location.search).toMatchObject({
      tab: 'users',
      open: 'user:auth0|ola-kowalska',
    })
    await user.click(
      await screen.findByRole('button', { name: m.perm_user_role_remove({ role: 'moderator' }) }),
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: m.perm_user_role_remove({ role: 'moderator' }) }),
      ).toBeNull(),
    )
    const { data } = await fetchClient.GET('/api/v1/admin/permissions/audit', {
      params: { query: {} },
    })
    expect(data?.[0]?.action).toBe('user.role.revoke')
  })

  it('filters users from the URL and keeps the page in range', async () => {
    useScenario('admin')
    renderApp('/admin/permissions?tab=users&q=ola&page=7')
    expect(await screen.findByText(m.list_range({ from: 1, to: 1, total: 1 }))).toBeTruthy()
    expect(screen.queryByText('auth0|mock-admin')).toBeNull()
  })

  it('lists the audit newest first', async () => {
    useScenario('admin')
    renderApp('/admin/permissions?tab=audit')
    const items = await screen.findAllByText(/^(user\.role\.assign|role\.create)$/)
    expect(items.map((item) => item.textContent)).toEqual(['user.role.assign', 'role.create'])
  })

  it('does not open the new-role form in read-only mode, even from the URL', async () => {
    useScenario('admin-readonly')
    renderApp('/admin/permissions?open=role%3A')
    expect(await roleButton('user')).toBeTruthy()
    expect(screen.queryByLabelText(m.perm_role_name_label())).toBeNull()
    expect(screen.queryByRole('button', { name: m.perm_role_create() })).toBeNull()
  })

  it('never asks for admin data when the account is not an admin', async () => {
    const asked: string[] = []
    server.events.on('request:start', ({ request }) => asked.push(new URL(request.url).pathname))
    renderApp('/admin/permissions?tab=users&open=user%3Aauth0%7Cx')
    expect(await screen.findByText(m.perm_no_access_title())).toBeTruthy()
    expect(asked.filter((path) => path.includes('/admin/'))).toEqual([])
  })
})
