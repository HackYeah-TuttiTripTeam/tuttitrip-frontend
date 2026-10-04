// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session, SessionStatus } from '@/hooks/use-session'
import { queryClient } from '@/lib/query-client'
import { m } from '@/paraglide/messages'
import { routeTree } from '@/routeTree.gen'

const session = vi.hoisted(() => ({ status: 'anonymous' as SessionStatus }))

vi.mock('@/hooks/use-session', () => ({
  useSession: (): Session => ({
    status: session.status,
    error: undefined,
    userName: undefined,
    userPicture: undefined,
    login: () => undefined,
    signup: () => undefined,
    logout: () => undefined,
  }),
}))

function renderAt(url: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
    context: { queryClient },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  queryClient.clear()
  session.status = 'anonymous'
})

describe('public pages', () => {
  it('keeps a guest on the landing page, with the footer links', async () => {
    const router = renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: m.home_title() })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/')
    const footer = screen.getByRole('navigation', { name: m.shell_nav_footer() })
    expect(footer.querySelector('a[href="/about"]')?.textContent).toBe(m.nav_about())
    expect(footer.querySelector('a[href="/contact"]')?.textContent).toBe(m.nav_contact())
    expect(footer.querySelector('a[href="/prywatnosc"]')?.textContent).toBe(m.nav_privacy())
  })

  it('shows the privacy policy to a guest, one heading per section', async () => {
    const router = renderAt('/prywatnosc')
    expect(await screen.findByRole('heading', { level: 1, name: m.privacy_title() })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/prywatnosc')
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(11)
    expect(screen.getByText('tuttitrip-demo-session')).toBeTruthy()
  })

  it('shows the landing page while the session loads when no session is stored', async () => {
    session.status = 'loading'
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: m.home_title() })).toBeTruthy()
  })

  it('shows nothing of the landing page while a stored session loads', () => {
    localStorage.setItem('@@auth0spajs@@::client::audience::scope', '{}')
    session.status = 'loading'
    const router = renderAt('/')
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(router.state.location.pathname).toBe('/')
  })

  it('sends a signed-in user to the trips without rendering the landing page', async () => {
    session.status = 'authenticated'
    const router = renderAt('/')
    expect(screen.queryByRole('heading', { name: m.home_title() })).toBeNull()
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'))
    expect(screen.queryByRole('heading', { name: m.home_title() })).toBeNull()
  })

  it('serves /about and /contact to a guest, without the app navigation', async () => {
    renderAt('/about')
    expect(await screen.findByRole('heading', { level: 1, name: m.about_title() })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: m.shell_nav_actions() })).toBeNull()
    cleanup()
    renderAt('/contact')
    expect(await screen.findByRole('heading', { level: 1, name: m.contact_title() })).toBeTruthy()
  })
})
