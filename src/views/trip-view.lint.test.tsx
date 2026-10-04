// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The jobs are polled every 2 s, so a full flow takes a few seconds.
vi.setConfig({ testTimeout: 40_000 })
configure({ asyncUtilTimeout: 15_000 })

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

const open = () => renderApp(`/trips/${TRIP_ID}?tab=plan&view=check`)

const pasteAPlan = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    (await screen.findAllByRole('button', { name: m.lint_paste_open() }))[0] as HTMLElement,
  )
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByLabelText(m.lint_paste_label()))
  await user.paste('Dzień 1: 9:00 Muzeum Narodowe, 13:00 obiad')
  await user.click(within(dialog).getByRole('button', { name: m.lint_paste_submit() }))
}

describe('plan check', () => {
  it('shows the empty state with a way to paste a plan', async () => {
    useScenario('family-warsaw')
    open()
    expect(await screen.findByText(m.lint_empty_title())).toBeTruthy()
    expect(screen.getAllByRole('button', { name: m.lint_paste_open() }).length).toBeGreaterThan(0)
  })

  it('shows the chatbot plan next to the TuttiTrip plan, with every rule and its count', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    const { router } = open()
    await pasteAPlan(user)

    const compare = await screen.findByRole('region', { name: m.lint_compare_title() })
    // 5 violations of the rules and 2 stops nobody could place: 7. The TuttiTrip plan has none.
    expect(within(compare).getByText('7')).toBeTruthy()
    expect(await within(compare).findByText('0')).toBeTruthy()
    expect(within(compare).getByText(m.lint_state_clean())).toBeTruthy()
    // The report is kept in the URL, so a reload shows it again.
    expect(router.state.location.search).toMatchObject({ paste: expect.any(String) })

    const rules = screen.getByRole('region', { name: m.lint_rules_title() })
    expect(within(rules).getAllByRole('listitem').length).toBeGreaterThanOrEqual(10)
    // A rule with no violation says so in words, not only by color.
    expect(within(rules).getByText(m.lint_rule_budget())).toBeTruthy()
    expect(within(rules).getAllByText(m.lint_rule_count({ count: 0 })).length).toBeGreaterThan(0)
  })

  it('recounts after the host picks a candidate for an unrecognised stop', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    await pasteAPlan(user)
    const unrecognized = await screen.findByRole('region', {
      name: m.lint_unrecognized_title({ count: 2 }),
    })
    await user.click(
      within(unrecognized).getByRole('button', {
        name: m.lint_unrecognized_pick_label({
          item: 'Restauracja Pod Dębem',
          place: 'Pod Dębem',
        }),
      }),
    )
    const compare = await screen.findByRole('region', { name: m.lint_compare_title() })
    await waitFor(() => expect(within(compare).getByText('6')).toBeTruthy())
    expect(
      screen.getByRole('region', { name: m.lint_unrecognized_title({ count: 1 }) }),
    ).toBeTruthy()
  })

  it('does not let a plain member pick a candidate', async () => {
    useScenario('member-readonly')
    const user = userEvent.setup()
    open()
    await pasteAPlan(user)
    const unrecognized = await screen.findByRole('region', {
      name: m.lint_unrecognized_title({ count: 2 }),
    })
    expect(within(unrecognized).queryByRole('button', { name: /^Wybierz|^Choose/ })).toBeNull()
    expect(within(unrecognized).getByText(m.lint_unrecognized_body_member())).toBeTruthy()
  })

  it('warns about a text over the limit and keeps the button off', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    await user.click(
      (await screen.findAllByRole('button', { name: m.lint_paste_open() }))[0] as HTMLElement,
    )
    const dialog = await screen.findByRole('dialog')
    const field = within(dialog).getByLabelText(m.lint_paste_label()) as HTMLTextAreaElement
    // Typing 20 000 characters one by one is slow: set the value in one go.
    await user.click(field)
    await user.paste('x'.repeat(20_001))
    expect(await within(dialog).findByText(/Tekst jest za długi/)).toBeTruthy()
    expect(
      (within(dialog).getByRole('button', { name: m.lint_paste_submit() }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  it('explains a worker that is not available', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    server.use(
      http.post('*/api/v1/trips/:tripId/linter/pastes', () =>
        HttpResponse.json({ detail: 'No worker' }, { status: 503 }),
      ),
    )
    await pasteAPlan(user)
    expect(await screen.findByText(m.lint_failure_unavailable())).toBeTruthy()
  })
})
