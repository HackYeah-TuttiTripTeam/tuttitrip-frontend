// @vitest-environment jsdom
import { cleanup, configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { clearVoteToken } from '@/lib/vote-link'
import { VOTE_TOKEN, VOTE_TOKEN_OTHER } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The first render of a route loads its chunk; under a parallel run that can take over a second.
configure({ asyncUtilTimeout: 5000 })

/** The browser opens a voting link: the address bar holds the fragment, the router starts at /glos. */
function openVote(hash = `#t=${VOTE_TOKEN}`) {
  clearVoteToken()
  window.history.replaceState(null, '', `/glos${hash}`)
  return renderApp('/glos')
}

interface Call {
  method: string
  path: string
  href: string
  token: string | null
  authorization: string | null
  body: unknown
}

function recordRequests() {
  const seen: Call[] = []
  server.events.on('request:start', async ({ request }) => {
    const { pathname } = new URL(request.url)
    if (!pathname.startsWith('/api/v1/')) return
    seen.push({
      method: request.method,
      path: pathname,
      href: window.location.href,
      token: request.headers.get('X-Access-Token'),
      authorization: request.headers.get('Authorization'),
      body: await request
        .clone()
        .json()
        .catch(() => null),
    })
  })
  return seen
}

const placeRow = (name: string) => {
  const heading = screen.getByRole('heading', { name })
  const row = heading.closest('li')
  if (!row) throw new Error(`no row for ${name}`)
  return within(row)
}

describe('VoteView', () => {
  it('opens without a login, strips the fragment first and sends the token only as a header', async () => {
    const seen = recordRequests()
    openVote()
    expect(await screen.findByRole('heading', { name: 'Zamek Królewski' })).toBeTruthy()

    expect(window.location.hash).toBe('')
    expect(screen.getByRole('heading', { name: m.vote_page_title({ name: 'Zosia' }) })).toBeTruthy()
    // No app shell: no sign-in buttons on a page for people without an account.
    expect(screen.queryByRole('button', { name: m.account_login() })).toBeNull()

    const calls = seen.filter((call) => call.path.startsWith('/api/v1/vote'))
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call.token).toBe(VOTE_TOKEN)
      expect(call.authorization).toBeNull()
      expect(call.href).not.toContain(VOTE_TOKEN)
      expect(call.path).not.toContain(VOTE_TOKEN)
    }
    const stored = JSON.stringify({ ...localStorage, ...sessionStorage })
    expect(stored + JSON.stringify(window.history.state)).not.toContain(VOTE_TOKEN)
  })

  it('shows no names or answers of other people', async () => {
    openVote()
    await screen.findByRole('heading', { name: 'Zamek Królewski' })
    expect(screen.queryByText(/Ola|Marek|Babcia/)).toBeNull()
  })

  it('saves "dont want" only after one tap on a reason', async () => {
    const seen = recordRequests()
    const user = userEvent.setup()
    openVote()
    await screen.findByRole('heading', { name: 'Zamek Królewski' })
    const castle = placeRow('Zamek Królewski')

    await user.click(castle.getByRole('button', { name: m.vote_dont_want() }))
    expect(seen.some((call) => call.method === 'PUT')).toBe(false)
    await user.click(castle.getByRole('button', { name: m.reason_too_expensive() }))

    expect(await screen.findByText(m.vote_thanks())).toBeTruthy()
    expect(seen.find((call) => call.method === 'PUT')?.body).toEqual({
      value: 'dont_want',
      reason_code: 'too_expensive',
    })
    expect(
      castle.getByText(
        m.vote_saved_reason({
          answer: m.vote_dont_want(),
          reason: m.reason_too_expensive().toLowerCase(),
        }),
      ),
    ).toBeTruthy()
  })

  it('saves a thumbs up at once', async () => {
    const seen = recordRequests()
    const user = userEvent.setup()
    openVote()
    await screen.findByRole('heading', { name: 'Zamek Królewski' })
    await user.click(placeRow('Zamek Królewski').getByRole('button', { name: m.vote_want() }))
    await screen.findByText(m.vote_thanks())
    expect(seen.find((call) => call.method === 'PUT')?.body).toEqual({
      value: 'want',
      reason_code: null,
    })
    expect(
      placeRow('Zamek Królewski').getByRole('button', { name: new RegExp(m.vote_want()) }),
    ).toHaveProperty('ariaPressed', 'true')
  })

  it('asks before a veto, shows the mark and lets the person withdraw it', async () => {
    const seen = recordRequests()
    const user = userEvent.setup()
    openVote()
    await screen.findByRole('heading', { name: 'Zamek Królewski' })
    const castle = placeRow('Zamek Królewski')

    await user.click(castle.getByRole('button', { name: m.vote_veto() }))
    expect(seen.some((call) => call.method === 'POST')).toBe(false)
    await user.click(castle.getByRole('button', { name: m.vote_veto_cancel() }))
    expect(castle.queryByText(m.vote_veto_active())).toBeNull()

    await user.click(castle.getByRole('button', { name: m.vote_veto() }))
    await user.click(castle.getByRole('button', { name: m.vote_veto_confirm() }))
    expect(await castle.findByText(m.vote_veto_active())).toBeTruthy()
    expect(seen.find((call) => call.method === 'POST')?.body).toMatchObject({
      place_id: expect.any(String),
    })

    await user.click(castle.getByRole('button', { name: new RegExp(m.vote_veto_withdraw()) }))
    await waitFor(() => expect(castle.queryByText(m.vote_veto_active())).toBeNull())
    expect(seen.some((call) => call.method === 'DELETE')).toBe(true)
  })

  it('says a revoked or expired link is dead, not "error"', async () => {
    useScenario('vote-dead')
    openVote()
    expect(await screen.findByText(m.vote_dead_title())).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Zamek Królewski' })).toBeNull()
  })

  it('explains a page opened without a token', async () => {
    openVote('')
    expect(await screen.findByText(m.vote_missing_title())).toBeTruthy()
  })

  it('says nothing was saved when a write fails', async () => {
    useScenario('vote-write-error')
    const user = userEvent.setup()
    openVote()
    await screen.findByRole('heading', { name: 'Zamek Królewski' })
    await user.click(placeRow('Zamek Królewski').getByRole('button', { name: m.vote_want() }))
    expect(await screen.findByText(m.vote_write_failed())).toBeTruthy()
    expect(screen.queryByText(m.vote_thanks())).toBeNull()
  })

  it("never shows the previous link's session for the next link", async () => {
    const user = userEvent.setup()
    openVote()
    await screen.findByRole('heading', { name: m.vote_page_title({ name: 'Zosia' }) })
    // Zosia rates something, so her session in the cache differs from a fresh one.
    await user.click(placeRow('Zamek Królewski').getByRole('button', { name: m.vote_want() }))
    await screen.findByText(m.vote_thanks())
    cleanup()

    // The same app, the same cache, a different link.
    openVote(`#t=${VOTE_TOKEN_OTHER}`)
    expect(
      await screen.findByRole('heading', { name: m.vote_page_title({ name: 'Antek' }) }),
    ).toBeTruthy()
    expect(screen.queryByText('Zosia')).toBeNull()
    expect(placeRow('Zamek Królewski').queryByText(/Zapisane/)).toBeNull()
  })
})
