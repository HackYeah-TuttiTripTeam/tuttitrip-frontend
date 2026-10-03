// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@/hooks/use-session'
import { clearJoinToken, peekJoinToken, stashJoinToken } from '@/lib/invite-link'
import { MOCK_USER_NAME, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const TOKEN = 'secret-invitation-token'

const session = vi.hoisted(() => ({ current: null as unknown as Session }))
vi.mock('@/hooks/use-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-session')>()),
  useSession: () => session.current,
}))

const sessionOf = (over: Partial<Session> = {}): Session => ({
  status: 'authenticated',
  error: undefined,
  userName: MOCK_USER_NAME,
  userPicture: undefined,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  ...over,
})

/** The browser opens a link: the address bar holds the fragment, the router starts at /join. */
function openInvite(hash = `#t=${TOKEN}`) {
  clearJoinToken()
  window.history.replaceState(null, '', `/join${hash}`)
  return renderApp('/join')
}

/** What the API saw: method, path, the location at that moment, and the JSON body. */
function recordRequests() {
  const seen: { method: string; path: string; href: string; body: unknown }[] = []
  server.events.on('request:start', async ({ request }) => {
    const { pathname } = new URL(request.url)
    if (!pathname.startsWith('/api/v1/')) return
    seen.push({
      method: request.method,
      path: pathname,
      href: window.location.href,
      body: await request
        .clone()
        .json()
        .catch(() => null),
    })
  })
  return seen
}

const bodyOf = (seen: ReturnType<typeof recordRequests>, path: string) =>
  seen.find((call) => call.method === 'POST' && call.path.endsWith(path))?.body

/** Everything a page can keep a token in, as one string. */
function everywhere(): string {
  const dump = (store: Storage) => Object.keys(store).map((key) => `${key}=${store.getItem(key)}`)
  return [
    window.location.href,
    JSON.stringify(window.history.state),
    ...dump(localStorage),
    ...dump(sessionStorage),
  ].join('\n')
}

describe('JoinView, signed in', () => {
  it('strips the fragment before any request, then previews and joins with the token in bodies', async () => {
    session.current = sessionOf()
    const seen = recordRequests()
    const { router } = openInvite()
    const user = userEvent.setup()

    expect(await screen.findByRole('heading', { name: 'Warszawa z rodziną' })).toBeTruthy()
    // The very first request already ran with a clean address bar.
    expect(seen.length).toBeGreaterThan(0)
    for (const call of seen) {
      expect(call.href).not.toContain(TOKEN)
      expect(call.href).not.toContain('#')
      expect(call.path).not.toContain(TOKEN)
    }
    expect(bodyOf(seen, '/invitations/preview')).toEqual({ token: TOKEN })

    const name = screen.getByLabelText(m.join_name_label())
    await user.clear(name)
    await user.type(name, ' Ola ')
    await user.click(screen.getByRole('button', { name: m.join_submit() }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`))
    expect(router.state.location.search).toEqual({ tab: 'people' })
    expect(bodyOf(seen, '/invitations/accept')).toEqual({ token: TOKEN, display_name: 'Ola' })
    // After the join the token is nowhere: not in the URL, history state, or either storage.
    expect(everywhere()).not.toContain(TOKEN)
    expect(peekJoinToken()).toBeNull()
  })

  it('sends no query string with the token on any request', async () => {
    session.current = sessionOf()
    const seen = recordRequests()
    openInvite()
    await screen.findByRole('heading', { name: 'Warszawa z rodziną' })
    expect(seen.every((call) => !call.path.includes('?') && !call.href.includes(TOKEN))).toBe(true)
  })

  it('re-accepting as an existing member sends no name and lands on the trip', async () => {
    useScenario('join-already-member')
    session.current = sessionOf()
    const seen = recordRequests()
    const { router } = openInvite()
    const user = userEvent.setup()

    expect(await screen.findByText(m.join_already_member())).toBeTruthy()
    expect(screen.queryByLabelText(m.join_name_label())).toBeNull()
    await user.click(screen.getByRole('button', { name: m.join_open() }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`))
    expect(bodyOf(seen, '/invitations/accept')).toEqual({ token: TOKEN, display_name: null })
    expect(everywhere()).not.toContain(TOKEN)
  })

  it('shows one message for a dead token and forgets it', async () => {
    useScenario('join-dead')
    session.current = sessionOf()
    stashJoinToken(TOKEN)
    openInvite()
    expect(await screen.findByText(m.join_dead_title())).toBeTruthy()
    expect(screen.getByText(m.join_dead_body())).toBeTruthy()
    expect(peekJoinToken()).toBeNull()
  })

  it('shows the same message when accepting fails with 404 after a good preview', async () => {
    useScenario('join-accept-dead')
    session.current = sessionOf()
    const user = userEvent.setup()
    openInvite()

    await user.click(await screen.findByRole('button', { name: m.join_submit() }))
    expect(await screen.findByText(m.join_dead_title())).toBeTruthy()
    expect(peekJoinToken()).toBeNull()
    expect(everywhere()).not.toContain(TOKEN)
  })

  it('explains a failed check with a retry and keeps nothing in storage', async () => {
    session.current = sessionOf()
    stashJoinToken(TOKEN)
    server.use(
      http.post('*/api/v1/invitations/preview', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    openInvite()
    expect(await screen.findByText(m.join_load_failed_title())).toBeTruthy()
    expect(screen.getByRole('button', { name: m.action_retry() })).toBeTruthy()
    expect(peekJoinToken()).toBeNull()
  })

  it('asks for a link when there is no token', async () => {
    session.current = sessionOf()
    const seen = recordRequests()
    openInvite('')
    expect(await screen.findByText(m.join_missing_title())).toBeTruthy()
    expect(seen).toHaveLength(0)
  })
})

describe('JoinView, signed out', () => {
  it('waits for the login without any request and stashes the token only on the button', async () => {
    const login = vi.fn()
    session.current = sessionOf({ status: 'anonymous', login })
    const seen = recordRequests()
    const user = userEvent.setup()
    openInvite()

    expect(await screen.findByText(m.join_login_body())).toBeTruthy()
    expect(seen).toHaveLength(0)
    expect(peekJoinToken()).toBeNull()

    await user.click(
      within(screen.getByRole('status')).getByRole('button', { name: m.account_login() }),
    )
    // Stashed before login() left the page.
    expect(login).toHaveBeenCalledOnce()
    expect(peekJoinToken()).toBe(TOKEN)
    expect(JSON.parse(sessionStorage.getItem('tuttitrip.join-token') ?? '{}')).toMatchObject({
      token: TOKEN,
    })
  })

  it('finishes the join after the login round-trip from the stash', async () => {
    // Back from Auth0: /join without a fragment, now signed in.
    session.current = sessionOf()
    clearJoinToken()
    stashJoinToken(TOKEN)
    window.history.replaceState(null, '', '/join')
    const seen = recordRequests()
    renderApp('/join')

    expect(await screen.findByRole('heading', { name: 'Warszawa z rodziną' })).toBeTruthy()
    expect(bodyOf(seen, '/invitations/preview')).toEqual({ token: TOKEN })
    // The login round-trip is over: nothing stays in storage.
    expect(peekJoinToken()).toBeNull()
  })

  it('forgets the token when the login is cancelled', async () => {
    session.current = sessionOf({ status: 'anonymous', error: m.auth_error_cancelled() })
    stashJoinToken(TOKEN)
    openInvite()
    expect(await screen.findByText(m.auth_error_cancelled())).toBeTruthy()
    expect(peekJoinToken()).toBeNull()
  })

  it('forgets the token when login is not available', async () => {
    session.current = sessionOf({ status: 'disabled' })
    stashJoinToken(TOKEN)
    openInvite()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(peekJoinToken()).toBeNull()
  })

  it('does not use an expired stash', async () => {
    session.current = sessionOf()
    clearJoinToken()
    stashJoinToken(TOKEN, Date.now() - 11 * 60 * 1000)
    window.history.replaceState(null, '', '/join')
    const seen = recordRequests()
    renderApp('/join')
    expect(await screen.findByText(m.join_missing_title())).toBeTruthy()
    expect(seen).toHaveLength(0)
  })
})
