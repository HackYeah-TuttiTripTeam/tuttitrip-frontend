// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { INVITATION_TOKEN, PROFILE_IDS, TRIP_ID, VOTE_TOKEN } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 5000 })

// The real component draws the SVG; here only what it was asked to encode matters.
const qr = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))
vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props: Record<string, unknown>) => {
    qr.props = props
    return <svg role="img" aria-label={String(props.title)} />
  },
}))

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

const openPeople = (search = '') => renderApp(`/trips/${TRIP_ID}?tab=people${search}`)

function recordCalls() {
  const calls: { method: string; path: string; search: string; body: unknown }[] = []
  server.events.on('request:start', async ({ request }) => {
    const url = new URL(request.url)
    calls.push({
      method: request.method,
      path: url.pathname,
      search: url.search,
      body: await request
        .clone()
        .json()
        .catch(() => null),
    })
  })
  return calls
}

describe('voting tools in the Osoby tab', () => {
  it('lists only people without an account, each with a voting link action', async () => {
    openPeople()
    const list = await screen.findByRole('list', { name: m.vote_links_list_label() })
    expect(within(list).getByText('Zosia')).toBeTruthy()
    expect(within(list).getByText('Antek')).toBeTruthy()
    expect(within(list).queryByText('Ola')).toBeNull()
    expect(within(list).queryByText('Marek')).toBeNull()
  })

  it('is hidden from a plain member, and nothing is requested', async () => {
    useScenario('member-readonly')
    const calls = recordCalls()
    openPeople()
    await screen.findByRole('list', { name: m.people_list_label() })
    expect(screen.queryByRole('heading', { name: m.vote_links_title() })).toBeNull()
    expect(calls.some((call) => call.path.includes('vote-'))).toBe(false)
  })

  it('creates a link and shows a QR code of exactly the link with the token in the fragment', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    openPeople()
    await screen.findByRole('list', { name: m.vote_links_list_label() })
    await user.click(
      screen.getByRole('button', { name: m.vote_link_create_label({ name: 'Zosia' }) }),
    )

    const field = await screen.findByLabelText<HTMLInputElement>(m.vote_link_field_label())
    expect(field.value).toBe(`${window.location.origin}/glos#t=${VOTE_TOKEN}`)
    expect(qr.props).toMatchObject({ value: field.value, level: 'M', marginSize: 4 })
    expect(screen.getByRole('button', { name: m.invite_share() })).toBeTruthy()
    expect(
      calls.find((call) => call.method === 'POST' && call.path.endsWith('/vote-links'))?.body,
    ).toEqual({ profile_id: PROFILE_IDS.zosia, expires_in_days: 14 })

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByLabelText(m.vote_link_field_label())).toBeNull())
    expect(document.body.innerHTML).not.toContain(VOTE_TOKEN)
    // The list now says the link works, and offers a new one instead of the old QR.
    expect(await screen.findByText(/jeszcze nieużyty/)).toBeTruthy()
  })

  it('revokes after confirmation', async () => {
    useScenario('vote-with-link')
    const calls = recordCalls()
    const user = userEvent.setup()
    openPeople()
    await screen.findByText(/ostatnio użyty/)
    await user.click(
      screen.getByRole('button', { name: m.vote_link_revoke_label({ name: 'Zosia' }) }),
    )
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: m.vote_link_revoke_confirm() }))
    expect(await screen.findByText(m.vote_link_status_revoked())).toBeTruthy()
    expect(calls.filter((call) => call.method === 'DELETE')).toHaveLength(1)
  })

  it('shows a conflict from the API in words', async () => {
    server.use(
      http.post('*/api/v1/trips/:tripId/vote-links', () =>
        HttpResponse.json({ detail: 'Has an account' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    openPeople()
    await screen.findByRole('list', { name: m.vote_links_list_label() })
    await user.click(
      screen.getByRole('button', { name: m.vote_link_create_label({ name: 'Zosia' }) }),
    )
    expect((await screen.findByRole('alert')).textContent).toBe(m.vote_link_create_conflict())
    expect(screen.queryByLabelText(m.vote_link_field_label())).toBeNull()
  })
})

describe('the result of the voting', () => {
  it('shows the group answers with who and where from', async () => {
    openPeople()
    const list = await screen.findByRole('list', { name: m.vote_summary_list_label() })
    expect(within(list).getByText('Zamek Królewski')).toBeTruthy()
    expect(within(list).getByText('Zosia: Chcę (link)')).toBeTruthy()
    expect(within(list).getByText('Marek: Nie chcę, za duży tłum (aplikacja)')).toBeTruthy()
  })

  it('keeps filters, sort and page in the URL and asks the API for them', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    const { router } = openPeople('&vsource=link&vveto=true&vsort=veto')
    await screen.findByText(m.vote_summary_no_match())
    const last = calls.filter((call) => call.path.endsWith('/vote-summary')).at(-1)
    expect(last?.search).toContain('source=link')
    expect(last?.search).toContain('has_veto=true')
    expect(last?.search).toContain('sort=veto')

    await user.click(screen.getByRole('switch', { name: m.vote_filter_veto() }))
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('vveto'))
  })

  it('shows a veto from a phone within the poll', async () => {
    const calls = recordCalls()
    let summary: import('@/mocks/fixtures').PlaceVoteSummary[] = []
    useScenario('family-warsaw', {
      tweak: (world) => {
        summary = world.voteSummary
      },
    })
    openPeople()
    await screen.findByRole('list', { name: m.vote_summary_list_label() })
    expect(screen.queryByText(/Weto \(1\)/)).toBeNull()

    // The veto arrives from the link while the panel is open.
    const row = summary[0]
    if (!row) throw new Error('no summary rows')
    row.veto_count = 1
    row.vetoes.push({
      veto_id: 'v1',
      profile_id: PROFILE_IDS.zosia,
      display_name: 'Zosia',
      source: 'link',
      created_at: new Date().toISOString(),
    })

    expect(
      await screen.findByText(/Weto \(1\): Zosia \(link\)/, {}, { timeout: 6000 }),
    ).toBeTruthy()
    expect(calls.filter((call) => call.path.endsWith('/vote-summary')).length).toBeGreaterThan(1)
  }, 10_000)
})

describe('a named invitation', () => {
  it('creates a one-use invitation for the chosen profile and shows link and QR', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    openPeople()
    await screen.findByRole('list', { name: m.vote_links_list_label() })
    await user.click(screen.getByRole('button', { name: m.invite_person_label({ name: 'Zosia' }) }))

    const field = await screen.findByLabelText<HTMLInputElement>(m.invite_link_label())
    expect(field.value).toBe(`${window.location.origin}/join#t=${INVITATION_TOKEN}`)
    expect(
      calls.find((call) => call.method === 'POST' && call.path.endsWith('/invitations'))?.body,
    ).toEqual({ expires_in_days: 7, max_uses: 1, profile_id: PROFILE_IDS.zosia })
  })

  it('offers it only for people without an account', async () => {
    openPeople()
    await screen.findByRole('list', { name: m.vote_links_list_label() })
    expect(
      screen.queryByRole('button', { name: m.invite_person_label({ name: 'Ola' }) }),
    ).toBeNull()
    expect(
      screen.getByRole('button', { name: m.invite_person_label({ name: 'Antek' }) }),
    ).toBeTruthy()
  })

  it('says for whom a named invitation is in the list', async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        const first = world.invitations[0]
        if (first) first.profile_id = PROFILE_IDS.zosia
      },
    })
    openPeople()
    expect(await screen.findByText(m.invite_row_for({ name: 'Zosia' }))).toBeTruthy()
  })

  it('explains a 409 (profile taken)', async () => {
    server.use(
      http.post('*/api/v1/trips/:tripId/invitations', () =>
        HttpResponse.json({ detail: 'Profile is taken' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    openPeople()
    await screen.findByRole('list', { name: m.vote_links_list_label() })
    await user.click(screen.getByRole('button', { name: m.invite_person_label({ name: 'Zosia' }) }))
    expect((await screen.findByRole('alert')).textContent).toBe(m.invite_person_conflict())
  })
})
