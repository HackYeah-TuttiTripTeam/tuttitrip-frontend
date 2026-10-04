// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// A lazy chunk and a streamed answer: under a loaded CI machine 1 s is not enough.
configure({ asyncUtilTimeout: 10_000 })

const DRAFT_PLAN = '*/api/v1/trips/:tripId/interview/draft-plan'
const openInterview = () => renderApp(`/trips/${TRIP_ID}?tab=interview`)
const buildButton = () => screen.findAllByRole('button', { name: m.interview_build() })

describe('Wywiad, Zbuduj plan teraz', () => {
  it('shows the button from the first screen, before any sentence', async () => {
    useScenario('interview-empty')
    openInterview()
    await screen.findByRole('textbox', { name: m.interview_first_label() })
    expect((await buildButton()).length).toBeGreaterThan(0)
  })

  it('says the city is missing when the trip has none', async () => {
    useScenario('interview-empty')
    const user = userEvent.setup()
    openInterview()
    await user.click((await buildButton())[0] as HTMLElement)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(m.interview_build_error_no_city())
    // Still in the interview, nothing was built.
    expect(screen.getByRole('textbox', { name: m.interview_first_label() })).toBeTruthy()
  })

  it('opens the Plan tab with the preliminary plan and its assumptions', async () => {
    useScenario('interview-city-only')
    const user = userEvent.setup()
    const { router } = openInterview()
    await user.click((await buildButton())[0] as HTMLElement)

    const banner = await screen.findByRole('region', { name: m.plan_draft_title() })
    expect(within(banner).getByText(m.plan_draft_assumption_budget())).toBeTruthy()
    expect(within(banner).getByText(m.plan_draft_assumption_people({ count: 2 }))).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ tab: 'plan' })
    // A preliminary plan cannot be sent for approval.
    expect(await screen.findByText(m.proposal_send_blocked())).toBeTruthy()
  })

  it('shows the stage of the build while it runs', async () => {
    useScenario('interview-city-only')
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get('*/api/v1/trips/:tripId/plans/progress', () =>
        HttpResponse.json({ step: 'budget', position: 5, total: 6, item: 1, items: 2 }),
      ),
      http.post(DRAFT_PLAN, async () => {
        await gate
        return HttpResponse.json({ detail: 'stop' }, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    openInterview()
    await user.click((await buildButton())[0] as HTMLElement)
    const progress = await screen.findByRole('region', { name: m.plan_progress_title() })
    const counted = `${m.plan_progress_budget()} ${m.plan_progress_count({ item: 1, items: 2 })}`
    await within(progress).findAllByText(counted, { exact: false })
    release()
  }, 20_000)

  it('explains a refusal of a co-host-only action', async () => {
    useScenario('interview-city-only')
    server.use(
      http.post(DRAFT_PLAN, () => Response.json({ detail: 'Brak uprawnienia' }, { status: 403 })),
    )
    const user = userEvent.setup()
    openInterview()
    await user.click((await buildButton())[0] as HTMLElement)
    expect((await screen.findByRole('alert')).textContent).toContain(
      m.interview_build_error_forbidden(),
    )
  })

  it('shows a failure and lets the host try again', async () => {
    useScenario('interview-city-only')
    server.use(http.post(DRAFT_PLAN, () => Response.json({ detail: 'boom' }, { status: 500 })))
    const user = userEvent.setup()
    openInterview()
    await user.click((await buildButton())[0] as HTMLElement)
    expect((await screen.findByRole('alert')).textContent).toContain(
      m.interview_build_error_failed(),
    )
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: m.interview_build() })[0]).toHaveProperty(
        'disabled',
        false,
      ),
    )
  })
})

describe('Wywiad, powrót do rozmowy', () => {
  it('says what is settled and what is missing above the earlier talk', async () => {
    useScenario('interview-resumed-partial')
    openInterview()
    const header = await screen.findByText(m.interview_resume_title())
    const text = header.parentElement?.textContent ?? ''
    expect(text).toContain(m.interview_resume_destination())
    expect(text).toContain(m.interview_resume_dates())
    expect(text).toContain(m.interview_resume_budget())
    // Settled first, missing after "Brakuje".
    const [settled, missing] = text.split('Brakuje')
    expect(settled).toContain(m.interview_resume_dates())
    expect(missing).toContain(m.interview_resume_budget())
    expect(missing).not.toContain(m.interview_resume_destination())
  })

  it('has no header for a trip without an earlier talk', async () => {
    useScenario('interview-empty')
    openInterview()
    await screen.findByRole('textbox', { name: m.interview_first_label() })
    expect(screen.queryByText(m.interview_resume_title())).toBeNull()
  })
})
