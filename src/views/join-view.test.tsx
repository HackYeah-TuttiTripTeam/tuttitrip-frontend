// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { createBrowserHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/hooks/use-session'
import { clearJoinToken, peekJoinToken } from '@/lib/invite-link'
import { queryClient } from '@/lib/query-client'
import { m } from '@/paraglide/messages'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { routeTree } from '@/routeTree.gen'

const TRIP_ID = '3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11'
// jsdom has no matchMedia; the phone layout (drawer) is what these tests see.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }) as unknown as MediaQueryList

const api = vi.hoisted(() => {
  const state: {
    calls: { method: string; path: string; body: unknown }[]
    /** Status of POST /invitations/preview and /accept. */
    previewStatus: number
    acceptStatus: number
    alreadyMember: boolean
  } = { calls: [], previewStatus: 200, acceptStatus: 200, alreadyMember: false }
  const BaseRequest = globalThis.Request
  globalThis.Request = class extends BaseRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(
        typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input,
        init,
      )
    }
  }
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  globalThis.fetch = async (input) => {
    const request = input instanceof Request ? input : new Request(String(input))
    const { pathname, search } = new URL(request.url)
    const text = await request.clone().text()
    state.calls.push({
      method: request.method,
      path: pathname + search,
      body: text ? JSON.parse(text) : null,
    })
    if (pathname.endsWith('/trips/3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11')) {
      return reply(200, {
        id: '3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11',
        name: 'Majówka w Krakowie',
        destination: 'Kraków',
        created_at: '2026-10-01T10:00:00Z',
        start_date: null,
        end_date: null,
        my_role: 'host',
        kind: 'trip',
      })
    }
    if (pathname.endsWith('/profiles') || pathname.endsWith('/members')) return reply(200, [])
    if (pathname.endsWith('/invitations/preview')) {
      return state.previewStatus === 200
        ? reply(200, {
            trip_name: 'Majówka w Krakowie',
            destination: 'Kraków',
            already_member: state.alreadyMember,
          })
        : reply(state.previewStatus, { detail: 'Invitation not found' })
    }
    if (pathname.endsWith('/invitations/accept')) {
      return state.acceptStatus === 200
        ? reply(200, {
            trip_id: '3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11',
            profile_id: 'p',
            role: 'member',
            already_member: state.alreadyMember,
          })
        : reply(state.acceptStatus, { detail: 'Invitation not found' })
    }
    if (pathname.endsWith('/invitations')) {
      return request.method === 'POST'
        ? reply(201, {
            id: 'i1',
            trip_id: '3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11',
            created_by_sub: 'auth0|1',
            created_at: '2026-10-03T12:00:00Z',
            expires_at: '2026-10-10T12:00:00Z',
            max_uses: 10,
            uses: 0,
            revoked_at: null,
            token: 'TOKEN-from-API_1',
          })
        : reply(200, [])
    }
    return reply(404, { detail: 'Not found' })
  }
  return state
})

const session = vi.hoisted(() => ({ current: null as unknown as Session }))
vi.mock('@/hooks/use-session', () => ({ useSession: () => session.current }))

const signedIn = (): Session => ({
  status: 'authenticated',
  error: undefined,
  userName: 'Anna Nowak',
  userPicture: undefined,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
})

function renderAt(url: string) {
  // The view reads and rewrites the real address bar, so the router uses the browser history.
  window.history.replaceState(null, '', url)
  const router = createRouter({
    routeTree,
    history: createBrowserHistory(),
    context: { queryClient },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

beforeEach(() => {
  overwriteGetLocale(() => 'pl')
  session.current = signedIn()
  clearJoinToken()
  Object.assign(api, { calls: [], previewStatus: 200, acceptStatus: 200, alreadyMember: false })
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  clearJoinToken()
  window.history.replaceState(null, '', '/')
})

describe('JoinView', () => {
  it('previews with the token in the body, joins and opens the People tab', async () => {
    const router = renderAt('/join#t=secret-token')
    expect(await screen.findByRole('heading', { name: 'Majówka w Krakowie' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText(m.join_name_label()), { target: { value: ' Ania ' } })
    fireEvent.click(screen.getByRole('button', { name: m.join_submit() }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`))
    expect(router.state.location.search).toEqual({ tab: 'people' })
    expect(router.state.location.hash).toBe('')

    const [preview, accept] = api.calls.filter((call) => call.method === 'POST')
    expect(preview?.body).toEqual({ token: 'secret-token' })
    expect(accept?.body).toEqual({ token: 'secret-token', display_name: 'Ania' })
    // The token is never in a path or query string.
    expect(api.calls.every((call) => !call.path.includes('secret-token'))).toBe(true)
    expect(peekJoinToken()).toBeNull()
  })

  it('removes the fragment from the address bar after reading it', async () => {
    const router = renderAt('/join#t=secret-token')
    await screen.findByRole('heading', { name: 'Majówka w Krakowie' })
    expect(router.state.location.hash).toBe('')
    expect(window.location.hash).toBe('')
    expect(router.history.location.href).toBe('/join')
  })

  it('opens an already joined trip without asking for a name', async () => {
    api.alreadyMember = true
    renderAt('/join#t=secret-token')
    expect(await screen.findByText(m.join_already_member())).toBeTruthy()
    expect(screen.queryByLabelText(m.join_name_label())).toBeNull()
    expect(screen.getByRole('button', { name: m.join_open() })).toBeTruthy()
  })

  it('explains a dead token and forgets it', async () => {
    api.previewStatus = 404
    renderAt('/join#t=dead')
    expect(await screen.findByText(m.join_dead_title())).toBeTruthy()
    expect(peekJoinToken()).toBeNull()
  })

  it('keeps the token for the login round-trip while signed out, then finishes', async () => {
    session.current = { ...signedIn(), status: 'anonymous' }
    renderAt('/join#t=secret-token')
    expect(await screen.findByText(m.join_login_title())).toBeTruthy()
    expect(api.calls).toHaveLength(0)
    expect(peekJoinToken()).toBe('secret-token')
    cleanup()

    // Back from Auth0: /join without a fragment, signed in.
    session.current = signedIn()
    renderAt('/join')
    expect(await screen.findByRole('heading', { name: 'Majówka w Krakowie' })).toBeTruthy()
    expect(api.calls[0]?.body).toEqual({ token: 'secret-token' })
  })

  it('asks for a link when there is no token', async () => {
    renderAt('/join')
    expect(await screen.findByText(m.join_missing_title())).toBeTruthy()
    expect(api.calls).toHaveLength(0)
  })
})

describe('invitations of a host', () => {
  it('creates a link and shows it as a /join#t= link with a QR code', async () => {
    renderAt(`/trips/${TRIP_ID}?tab=people`)
    fireEvent.click(await screen.findByRole('button', { name: m.invite_action() }))
    const field = await screen.findByLabelText<HTMLInputElement>(m.invite_link_label())
    expect(field.value).toBe(`${window.location.origin}/join#t=TOKEN-from-API_1`)
    expect(screen.getByRole('img', { name: m.invite_qr_label() })).toBeTruthy()
    const post = api.calls.find((call) => call.method === 'POST')
    expect(post?.body).toEqual({ expires_in_days: 7, max_uses: 10 })
  })
})
