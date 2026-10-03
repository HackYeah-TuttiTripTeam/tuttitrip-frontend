// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

describe('trips flow', () => {
  it('goes from the list to a trip and through its tabs', async () => {
    const user = userEvent.setup()
    renderApp('/trips')

    const trip = await screen.findByRole('link', { name: /Warszawa z rodziną/ })
    await user.click(trip)

    const interview = await screen.findByRole('tab', { name: m.trip_tab_interview() })
    expect(interview.getAttribute('aria-selected')).toBe('true')

    await user.click(screen.getByRole('tab', { name: m.trip_tab_people() }))
    const people = await screen.findByRole('tabpanel', { name: m.trip_tab_people() })
    expect(within(people).getByText(m.trip_people_title())).toBeTruthy()

    await user.click(screen.getByRole('tab', { name: m.trip_tab_plan() }))
    const plan = await screen.findByRole('tabpanel', { name: m.trip_tab_plan() })
    expect(await within(plan).findByText('Zamek Królewski')).toBeTruthy()
  })

  it('builds the first plan with "Policz plan" and shows it without a reload', async () => {
    useScenario('no-plan')
    const user = userEvent.setup()
    renderApp('/trips')

    await user.click(await screen.findByRole('link', { name: /Warszawa z rodziną/ }))
    await user.click(await screen.findByRole('tab', { name: m.trip_tab_plan() }))
    await user.click(await screen.findByRole('button', { name: m.plan_compute() }))

    const plan = await screen.findByRole('tabpanel', { name: m.trip_tab_plan() })
    expect(await within(plan).findByText('Zamek Królewski')).toBeTruthy()
    expect(within(plan).queryByText(m.plan_empty_title())).toBeNull()
  })

  it('shows the list error state when the server fails', async () => {
    useScenario('server-error')
    renderApp('/trips')
    expect(await screen.findByText(m.trips_load_failed_title())).toBeTruthy()
  })
})
