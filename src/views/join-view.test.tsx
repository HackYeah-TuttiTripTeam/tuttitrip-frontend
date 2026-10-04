// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@/hooks/use-session'
import { clearJoinToken, peekJoinToken, stashJoinToken } from '@/lib/invite-link'
import { MOCK_USER_NAME, PROFILE_IDS, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The first render of a route loads its chunk; under a parallel run that can take over a second.
configure({ asyncUtilTimeout: 5000 })

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
    // /me is the app shell's own check of the menu, not something the join page asks for.
    if (!pathname.startsWith('/api/v1/') || pathname === '/api/v1/me') return
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

describe('JoinView, claiming a profile', () => {
  const optionOf = (name: string) => screen.findByRole('radio', { name: new RegExp(name) })
  const submitButton = () =>
    screen.getByRole('button', { name: m.join_submit() }) as HTMLButtonElement

  it('offers the profiles, then claims the chosen one without sending a name', async () => {
    useScenario('join-claimable')
    session.current = sessionOf()
    const seen = recordRequests()
    const { router } = openInvite()
    const user = userEvent.setup()

    expect(await screen.findByText(m.join_claim_legend())).toBeTruthy()
    // Nothing is chosen yet: no name field, and the button says why it is off.
    expect(submitButton().disabled).toBe(true)
    expect(submitButton().getAttribute('aria-describedby')).toBe('join-submit-hint')
    expect(document.getElementById('join-submit-hint')?.textContent).toBe(m.join_claim_choose())
    expect(screen.queryByLabelText(m.join_name_label())).toBeNull()

    await user.click(await optionOf('Zosia'))
    expect(screen.getByRole('radio', { name: /Zosia/ }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: /Antek/ }).getAttribute('aria-checked')).toBe('false')
    expect(submitButton().disabled).toBe(false)
    await user.click(submitButton())

    await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`))
    expect(bodyOf(seen, '/invitations/accept')).toEqual({
      token: TOKEN,
      profile_id: PROFILE_IDS.zosia,
    })
    expect(everywhere()).not.toContain(TOKEN)
  })

  it('names the group and works from the keyboard', async () => {
    useScenario('join-claimable')
    session.current = sessionOf()
    openInvite()
    const user = userEvent.setup()

    const group = await screen.findByRole('radiogroup', { name: m.join_claim_legend() })
    expect(group.getAttribute('aria-describedby')).toBe('join-claim-hint')
    expect(document.getElementById('join-claim-hint')?.textContent).toBe(m.join_claim_hint())

    await user.tab()
    // Header links come first; tab on until the group has focus.
    for (let i = 0; i < 20 && !group.contains(document.activeElement); i++) await user.tab()
    expect(group.contains(document.activeElement)).toBe(true)
    const checked = (name: RegExp | string) =>
      screen.getByRole('radio', { name }).getAttribute('aria-checked')
    await user.keyboard('[Space]')
    await waitFor(() => expect(checked(/Zosia/)).toBe('true'))
    // Arrows move focus along the group; Space picks the focused radio.
    const focused = () => document.activeElement?.getAttribute('aria-checked') !== undefined
    await user.keyboard('{ArrowDown}')
    expect(focused()).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: /Antek/ }))
    await user.keyboard('[Space]')
    await waitFor(() => expect(checked(/Antek/)).toBe('true'))
    await user.keyboard('{ArrowDown}[Space]')
    await waitFor(() => expect(checked(m.join_claim_new())).toBe('true'))
    expect(await screen.findByLabelText(m.join_name_label())).toBeTruthy()
    await user.keyboard('{ArrowUp}{ArrowUp}[Space]')
    await waitFor(() => expect(checked(/Zosia/)).toBe('true'))
    expect(checked(/Antek/)).toBe('false')
  })

  it('"none of these" asks for a name and joins as a new person', async () => {
    useScenario('join-claimable')
    session.current = sessionOf()
    const seen = recordRequests()
    const { router } = openInvite()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('radio', { name: m.join_claim_new() }))
    const name = await screen.findByLabelText(m.join_name_label())
    await user.clear(name)
    await user.type(name, 'Ola')
    await user.click(submitButton())

    await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`))
    expect(bodyOf(seen, '/invitations/accept')).toEqual({ token: TOKEN, display_name: 'Ola' })
  })

  it('shows no step when nobody can be claimed', async () => {
    session.current = sessionOf()
    openInvite()
    await screen.findByLabelText(m.join_name_label())
    expect(screen.queryByText(m.join_claim_legend())).toBeNull()
  })

  it('shows no step to someone who is on the trip already, even if profiles are listed', async () => {
    session.current = sessionOf()
    const seen = recordRequests()
    server.use(
      http.post('*/api/v1/invitations/preview', () =>
        HttpResponse.json({
          trip_name: 'Warszawa z rodziną',
          destination: null,
          already_member: true,
          claimable_profiles: [
            { profile_id: PROFILE_IDS.zosia, display_name: 'Zosia', age_group: 'child' },
          ],
          named_profile_id: null,
        }),
      ),
    )
    const user = userEvent.setup()
    openInvite()

    expect(await screen.findByText(m.join_already_member())).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByLabelText(m.join_name_label())).toBeNull()
    await user.click(screen.getByRole('button', { name: m.join_open() }))
    await waitFor(() => expect(bodyOf(seen, '/invitations/accept')).toBeTruthy())
    expect(bodyOf(seen, '/invitations/accept')).toEqual({ token: TOKEN, display_name: null })
  })

  it('explains a lost race and lets the user choose again from the refreshed list', async () => {
    useScenario('join-claim-taken')
    session.current = sessionOf()
    const seen = recordRequests()
    const user = userEvent.setup()
    openInvite()

    await user.click(await optionOf('Zosia'))
    await user.click(submitButton())

    expect((await screen.findByRole('alert')).textContent).toBe(m.join_claim_taken())
    // The list was loaded again: the lost profile is gone, the other one stays, nothing is chosen.
    await waitFor(() => expect(screen.queryByRole('radio', { name: /Zosia/ })).toBeNull())
    expect(screen.getByRole('radio', { name: /Antek/ })).toBeTruthy()
    expect(seen.filter((call) => call.path.endsWith('/invitations/preview'))).toHaveLength(2)
    expect(submitButton().disabled).toBe(true)
    expect(everywhere()).not.toContain(TOKEN)
  })

  it('a named invitation says whom it is for and joins with that profile, no choice and no name', async () => {
    useScenario('join-named')
    session.current = sessionOf()
    const seen = recordRequests()
    const { router } = openInvite()
    const user = userEvent.setup()

    expect(await screen.findByText(m.join_claim_named({ name: 'Zosia' }))).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByLabelText(m.join_name_label())).toBeNull()
    expect(submitButton().disabled).toBe(false)
    await user.click(submitButton())

    await waitFor(() => expect(router.state.location.pathname).toBe(`/trips/${TRIP_ID}`))
    expect(bodyOf(seen, '/invitations/accept')).toEqual({
      token: TOKEN,
      profile_id: PROFILE_IDS.zosia,
    })
  })

  it('a named invitation whose profile is gone says so and offers no way to continue', async () => {
    useScenario('join-named-taken')
    session.current = sessionOf()
    const user = userEvent.setup()
    openInvite()

    await user.click(await screen.findByRole('button', { name: m.join_submit() }))
    // The 409 gets its own message, not the "someone took it, choose again" one.
    expect((await screen.findByText(m.join_claim_named_failed())).getAttribute('role')).toBe(
      'alert',
    )
    expect(screen.queryByText(m.join_claim_taken())).toBeNull()
    expect(await screen.findByText(m.join_claim_named_unavailable())).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.join_submit() })).toBeNull()
  })

  it('a 409 on a named invitation uses the named message', async () => {
    useScenario('join-named')
    session.current = sessionOf()
    server.use(
      http.post('*/api/v1/invitations/accept', () =>
        HttpResponse.json({ detail: 'Invitation is for another profile' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    openInvite()

    await user.click(await screen.findByRole('button', { name: m.join_submit() }))
    expect(await screen.findByText(m.join_claim_named_failed())).toBeTruthy()
    expect(screen.queryByText(m.join_claim_taken())).toBeNull()
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
