// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { exchangeDemoInvitation } from '@/api/client'
import { ApiError } from '@/api/errors'
import {
  captureDemoFragment,
  clearDemoSession,
  getDemoInvitation,
  getDemoStatus,
  getDemoToken,
  markDemoExpired,
  resetDemoSessionForTests,
  restoreDemoSession,
  setDemoSession,
} from '@/lib/demo-session'
import { MOCK_DEMO_TOKEN } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

/** Opens the link the way the jury does: the browser holds /demo#t=..., main.tsx captures it. */
function openLink(token: string) {
  window.history.replaceState(null, '', `/demo#t=${token}`)
  captureDemoFragment()
}

beforeEach(() => {
  resetDemoSessionForTests()
  window.history.replaceState(null, '', '/')
})

describe('/demo', () => {
  it('removes the fragment from the address bar before the first request', async () => {
    const hashAtRequest: string[] = []
    const order: string[] = []
    window.history.replaceState(null, '', `/demo#t=${MOCK_DEMO_TOKEN}`)
    const realReplaceState = window.history.replaceState.bind(window.history)
    window.history.replaceState = (...args: Parameters<History['replaceState']>) => {
      order.push('replaceState')
      realReplaceState(...args)
    }
    server.events.on('request:start', ({ request }) => {
      order.push(`request ${new URL(request.url).pathname}`)
      hashAtRequest.push(window.location.hash)
    })
    captureDemoFragment()
    window.history.replaceState = realReplaceState
    // The fragment is gone before anything is sent.
    expect(order).toEqual(['replaceState'])
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/demo')

    renderApp('/demo')
    await screen.findAllByText(/Warszawa z rodziną/)

    expect(hashAtRequest.length).toBeGreaterThan(0)
    expect(hashAtRequest.every((hash) => hash === '')).toBe(true)
  })

  it('stores the session in memory and sessionStorage only, and opens the Warsaw trip', async () => {
    const authorization: (string | null)[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/api/v1/trips'))
        authorization.push(request.headers.get('Authorization'))
    })
    openLink(MOCK_DEMO_TOKEN)
    const { router } = renderApp('/demo')

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/trips\/.+/))
    expect(getDemoStatus()).toBe('active')
    expect(getDemoToken()).toBe('mock-demo-access-token')
    expect(authorization[0]).toBe('Bearer mock-demo-access-token')
    expect(sessionStorage.getItem('tuttitrip-demo-session')).toContain('mock-demo-access-token')
    // Neither token is anywhere a script of another origin or a bookmark could reach it.
    expect(JSON.stringify({ ...localStorage })).not.toContain('mock-demo')
    expect(window.location.href).not.toContain(MOCK_DEMO_TOKEN)
    expect(router.state.location.href).not.toContain(MOCK_DEMO_TOKEN)
  })

  it('shows the shared-account banner with a link to /contact', async () => {
    openLink(MOCK_DEMO_TOKEN)
    renderApp('/demo')

    const banner = await screen.findByRole('complementary', { name: m.demo_banner_label() })
    expect(banner.textContent).toContain(m.demo_banner_text())
    const link = await screen.findByRole('link', { name: m.demo_banner_admin_link() })
    expect(link.getAttribute('href')).toBe('/contact')
  })

  it('explains a wrong token and links to the home page', async () => {
    openLink('wrong')
    renderApp('/demo')

    expect(await screen.findByText(m.demo_invalid_title())).toBeTruthy()
    expect(screen.getByRole('link', { name: m.demo_back_home() }).getAttribute('href')).toBe('/')
    expect(getDemoStatus()).toBe('none')
    expect(sessionStorage.length).toBe(0)
  })

  it('treats a switched-off token like a wrong one', async () => {
    useScenario('demo-disabled')
    openLink(MOCK_DEMO_TOKEN)
    renderApp('/demo')
    expect(await screen.findByText(m.demo_invalid_title())).toBeTruthy()
  })

  it('says so when the link has no token', async () => {
    renderApp('/demo')
    expect(await screen.findByText(m.demo_missing_title())).toBeTruthy()
  })

  it('shows no banner without a demo session', async () => {
    renderApp('/contact')
    await screen.findByRole('heading', { name: m.contact_title() })
    expect(screen.queryByRole('complementary', { name: m.demo_banner_label() })).toBeNull()
  })

  it('logout forgets the session, and entering again needs the link', async () => {
    const user = userEvent.setup()
    openLink(MOCK_DEMO_TOKEN)
    const { router } = renderApp('/demo')
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/trips\/.+/))

    const [account] = await screen.findAllByRole('button', {
      name: new RegExp(m.demo_account_name()),
    })
    if (!account) throw new Error('No account menu')
    await user.click(account)
    await user.click(await screen.findByRole('menuitem', { name: m.account_logout() }))

    await waitFor(() => expect(getDemoStatus()).toBe('none'))
    expect(getDemoToken()).toBeUndefined()
    expect(sessionStorage.getItem('tuttitrip-demo-session')).toBeNull()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))

    await router.navigate({ to: '/demo' })
    expect(await screen.findByText(m.demo_missing_title())).toBeTruthy()
  })

  it('sends an expired session to /demo with a message to enter again', async () => {
    openLink(MOCK_DEMO_TOKEN)
    const { router } = renderApp('/demo')
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/trips\/.+/))

    markDemoExpired()

    expect(await screen.findByText(m.demo_expired_title())).toBeTruthy()
    expect(router.state.location.pathname).toBe('/demo')
    expect(getDemoToken()).toBeUndefined()
  })

  it('says so when the server is rate limiting this address', async () => {
    useScenario('demo-rate-limited')
    openLink(MOCK_DEMO_TOKEN)
    renderApp('/demo')
    expect(await screen.findByText(m.demo_rate_limited_title())).toBeTruthy()
    expect(screen.getByText(m.demo_rate_limited_body())).toBeTruthy()
    expect(getDemoStatus()).toBe('none')
  })

  it('keeps a working session when the new link is bad', async () => {
    setDemoSession('still-good', 3600, 'old-invitation')
    openLink('wrong')
    renderApp('/demo')
    expect(await screen.findByText(m.demo_invalid_title())).toBeTruthy()
    expect(getDemoStatus()).toBe('active')
    expect(getDemoToken()).toBe('still-good')
    expect(getDemoInvitation()).toBe('old-invitation')
  })

  it('draws /demo without the header, so no sign-in buttons flash', async () => {
    openLink('wrong')
    renderApp('/demo')
    await screen.findByText(m.demo_invalid_title())
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.queryByRole('button', { name: m.account_login() })).toBeNull()
  })
})

describe('demo session renewal', () => {
  const tripsCalls = () => {
    const seen: (string | null)[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/api/v1/trips')) seen.push(request.headers.get('Authorization'))
    })
    return seen
  }

  it('exchanges the stored invitation again when the access token has run out', async () => {
    const { fetchClient } = await import('@/api/client')
    await exchangeDemoInvitation(MOCK_DEMO_TOKEN)
    // Same tab, an hour later: the access token is stale, the invitation is still stored.
    setDemoSession('stale', -1, MOCK_DEMO_TOKEN)
    expect(getDemoToken()).toBeUndefined()
    const seen = tripsCalls()

    await fetchClient.GET('/api/v1/trips')

    expect(seen).toEqual(['Bearer mock-demo-access-token'])
    expect(getDemoStatus()).toBe('active')
  })

  it('renews and retries once after a 401, and ends the session when the invitation is refused', async () => {
    const { fetchClient } = await import('@/api/client')
    await exchangeDemoInvitation(MOCK_DEMO_TOKEN)
    let first = true
    server.use(
      http.get('*/api/v1/trips', () => {
        if (!first) return HttpResponse.json([])
        first = false
        return HttpResponse.json({ detail: 'expired' }, { status: 401 })
      }),
    )
    const answer = await fetchClient.GET('/api/v1/trips')
    expect(answer.data).toEqual([])
    expect(getDemoStatus()).toBe('active')

    useScenario('demo-disabled')
    server.use(http.get('*/api/v1/trips', () => HttpResponse.json({}, { status: 401 })))
    await expect(fetchClient.GET('/api/v1/trips')).rejects.toBeInstanceOf(ApiError)
    expect(getDemoStatus()).toBe('expired')
    expect(getDemoInvitation()).toBeUndefined()
  })

  it('a late 401 for an old token does not end the fresh session', async () => {
    const { fetchClient } = await import('@/api/client')
    setDemoSession('old-token', 3600, MOCK_DEMO_TOKEN)
    const seen: (string | null)[] = []
    server.use(
      http.get('*/api/v1/trips', async ({ request }) => {
        seen.push(request.headers.get('Authorization'))
        if (request.headers.get('Authorization') === 'Bearer old-token') {
          // A renewal lands while this request is still on its way.
          setDemoSession('fresh-token', 3600, MOCK_DEMO_TOKEN)
          return HttpResponse.json({}, { status: 401 })
        }
        return HttpResponse.json([])
      }),
    )
    const answer = await fetchClient.GET('/api/v1/trips')
    expect(answer.data).toEqual([])
    expect(seen).toEqual(['Bearer old-token', 'Bearer fresh-token'])
    expect(getDemoToken()).toBe('fresh-token')
    expect(getDemoStatus()).toBe('active')
  })

  it('keeps the invitation across a reload of the tab and erases it on logout', () => {
    setDemoSession('a', 3600, 'inv')
    restoreDemoSession()
    expect(getDemoInvitation()).toBe('inv')
    clearDemoSession()
    expect(getDemoInvitation()).toBeUndefined()
    expect(sessionStorage.getItem('tuttitrip-demo-session')).toBeNull()
  })
})
