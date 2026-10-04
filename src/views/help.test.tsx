// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const helpButton = () => screen.findByRole('button', { name: m.help_open() })

describe('visual help', () => {
  it('opens the trip list guide from the shell, steps with the keyboard and closes on Escape', async () => {
    const user = userEvent.setup()
    renderApp('/trips')
    await user.click(await helpButton())

    const dialog = await screen.findByRole('dialog', { name: m.help_trips_title() })
    expect(dialog.textContent).toContain(m.help_trips_header_title())
    await user.keyboard('{ArrowRight}')
    expect(dialog.textContent).toContain(m.help_trips_new_title())
    // The ring is on a real data-tour element of the page.
    expect(document.querySelector('[data-slot="tour-spotlight"]')).toBeTruthy()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('gives each trip tab its own guide', async () => {
    const user = userEvent.setup()
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await user.click(await helpButton())
    expect(await screen.findByRole('dialog', { name: m.help_trip_plan_title() })).toBeTruthy()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await user.click(await screen.findByRole('tab', { name: m.trip_tab_people() }))
    await user.click(await helpButton())
    expect(await screen.findByRole('dialog', { name: m.help_trip_people_title() })).toBeTruthy()
  })
})
