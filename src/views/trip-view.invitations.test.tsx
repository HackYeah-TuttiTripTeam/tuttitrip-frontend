// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { INVITATION_TOKEN, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

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

const openPeople = () => renderApp(`/trips/${TRIP_ID}?tab=people`)
const inviteHeading = () => screen.queryByRole('heading', { name: m.invite_title() })

function recordCalls() {
  const calls: { method: string; path: string; body: unknown }[] = []
  server.events.on('request:start', async ({ request }) => {
    const { pathname } = new URL(request.url)
    calls.push({
      method: request.method,
      path: pathname,
      body: await request
        .clone()
        .json()
        .catch(() => null),
    })
  })
  return calls
}

describe('invitation tools in the Osoby tab', () => {
  it('shows them to the host', async () => {
    openPeople()
    expect(await screen.findByRole('heading', { name: m.invite_title() })).toBeTruthy()
    expect(screen.getByRole('button', { name: m.invite_action() })).toBeTruthy()
  })

  it('shows them to a co-host', async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        for (const trip of world.trips) trip.my_role = 'co_host'
      },
    })
    openPeople()
    expect(await screen.findByRole('heading', { name: m.invite_title() })).toBeTruthy()
  })

  it('hides them from a plain member and never asks for the list', async () => {
    useScenario('member-readonly')
    const calls = recordCalls()
    openPeople()
    await screen.findByRole('list', { name: m.people_list_label() })
    expect(inviteHeading()).toBeNull()
    expect(screen.queryByRole('button', { name: m.invite_action() })).toBeNull()
    expect(calls.some((call) => call.path.endsWith('/invitations'))).toBe(false)
  })

  it('lists the invitations with expiry and uses', async () => {
    openPeople()
    expect(await screen.findByText(m.invite_row_uses({ uses: 3, max: 10 }))).toBeTruthy()
    expect(screen.getByText(m.invite_status_active())).toBeTruthy()
  })
})

describe('creating a link', () => {
  it('shows a link with the token in the fragment and a QR code of exactly that link', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    openPeople()
    await user.click(await screen.findByRole('button', { name: m.invite_action() }))

    const field = await screen.findByLabelText<HTMLInputElement>(m.invite_link_label())
    expect(field.value).toBe(`${window.location.origin}/join#t=${INVITATION_TOKEN}`)
    expect(new URL(field.value).search).toBe('')
    // The code encodes the displayed link, with the error correction and quiet zone scanners need.
    expect(qr.props).toMatchObject({ value: field.value, level: 'M', marginSize: 4 })
    expect(
      calls.find((call) => call.method === 'POST' && call.path.endsWith('/invitations'))?.body,
    ).toEqual({ expires_in_days: 7, max_uses: 10 })
  })

  it('copies the link when the browser has no Web Share, confirms, and the note fades', async () => {
    const user = userEvent.setup()
    expect('share' in navigator).toBe(false)
    openPeople()
    await user.click(await screen.findByRole('button', { name: m.invite_action() }))
    const field = await screen.findByLabelText<HTMLInputElement>(m.invite_link_label())

    await user.click(screen.getByRole('button', { name: m.invite_share() }))
    expect(await screen.findByText(m.invite_copied())).toBeTruthy()
    expect(await navigator.clipboard.readText()).toBe(field.value)

    await waitFor(() => expect(screen.queryByText(m.invite_copied())).toBeNull(), {
      timeout: 6000,
    })
  }, 10_000)

  it('keeps no token once the dialog is closed', async () => {
    const user = userEvent.setup()
    openPeople()
    await user.click(await screen.findByRole('button', { name: m.invite_action() }))
    await screen.findByLabelText(m.invite_link_label())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByLabelText(m.invite_link_label())).toBeNull())
    expect(document.body.innerHTML).not.toContain(INVITATION_TOKEN)
  })
})

describe('revoking', () => {
  it('asks first, naming the invitation, and sends nothing when the host keeps it', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    openPeople()
    await user.click(await screen.findByRole('button', { name: new RegExp(m.invite_revoke()) }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(m.invite_revoke_confirm_title())).toBeTruthy()
    expect(within(dialog).getByText(/3 z 10/)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: m.invite_revoke_keep() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    expect(screen.getByText(m.invite_status_active())).toBeTruthy()
  })

  it('revokes after the confirmation and moves the invitation to the earlier ones', async () => {
    const calls = recordCalls()
    const user = userEvent.setup()
    openPeople()
    await user.click(await screen.findByRole('button', { name: new RegExp(m.invite_revoke()) }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: m.invite_revoke_confirm() }))

    await screen.findByText(m.invite_earlier({ count: 1 }))
    expect(calls.filter((call) => call.method === 'DELETE')).toHaveLength(1)
    expect(screen.queryByText(m.invite_status_active())).toBeNull()
  })
})
