// @vitest-environment jsdom
import { configure, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 10_000 })

const API = '*/api/v1'

/** A build that stays in flight until the test lets it go, with the stage the API reports. */
function holdBuild(path: string, stage: object | null) {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get(`${API}/trips/:tripId/plans/progress`, () => HttpResponse.json(stage)),
    http.post(`${API}/trips/:tripId/${path}`, async () => {
      await gate
      return HttpResponse.json({ detail: 'stop' }, { status: 500 })
    }),
  )
  return release
}

describe('Plan, postęp liczenia', () => {
  it('shows the stage while the plan is recalculated', async () => {
    useScenario('proposal-sent')
    const release = holdBuild('plans', {
      step: 'reference',
      position: 2,
      total: 6,
      item: 2,
      items: 4,
    })
    const user = userEvent.setup()
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await user.click(await screen.findByRole('button', { name: m.plan_recompute() }))
    const progress = await screen.findByRole('region', { name: m.plan_progress_title() })
    const counted = `${m.plan_progress_reference()} ${m.plan_progress_count({ item: 2, items: 4 })}`
    await within(progress).findAllByText(counted, { exact: false })
    const current = within(progress)
      .getAllByRole('listitem')
      .find((item) => item.getAttribute('aria-current') === 'step')
    expect(current?.textContent).toContain(m.plan_progress_reference())
    release()
  }, 20_000)

  it('shows the first stage before the API has answered', async () => {
    useScenario('no-plan')
    const release = holdBuild('plans', null)
    const user = userEvent.setup()
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await user.click(await screen.findByRole('button', { name: m.plan_compute() }))
    const progress = await screen.findByRole('region', { name: m.plan_progress_title() })
    expect(within(progress).getAllByRole('listitem')[0]?.getAttribute('aria-current')).toBe('step')
    release()
  }, 20_000)
})
