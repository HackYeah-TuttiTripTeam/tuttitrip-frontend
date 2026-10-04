// @vitest-environment jsdom
import { configure, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { useScenario } from '@/mocks/node'
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

const open = () => renderApp(`/trips/${TRIP_ID}?tab=plan`)

describe('places for a new city', () => {
  it('shows the progress, then the plan, without a reload', async () => {
    useScenario('new-city')
    const user = userEvent.setup()
    open()
    await user.click(await screen.findByRole('button', { name: m.plan_compute() }))

    expect(await screen.findByText(m.places_fetching_title({ city: 'Gliwice' }))).toBeTruthy()
    expect(screen.getByText(m.places_unverified_note())).toBeTruthy()
    // The plan appears by itself once the places are in.
    expect(await screen.findByText(m.plan_version({ n: 1 }))).toBeTruthy()
    // Data from OpenStreetMap carries its attribution.
    const attribution = screen.getByRole('link', { name: m.places_osm_attribution() })
    expect(attribution.getAttribute('href')).toBe('https://www.openstreetmap.org/copyright')
  })

  it('explains an external failure and starts the fetch again on retry', async () => {
    useScenario('new-city-fetch-error')
    const user = userEvent.setup()
    open()
    await user.click(await screen.findByRole('button', { name: m.plan_compute() }))

    expect(await screen.findByText(m.places_failed_title({ city: 'Gliwice' }))).toBeTruthy()
    expect(screen.getByText(m.places_failure_external())).toBeTruthy()
    await user.click(screen.getByRole('button', { name: m.action_retry() }))
    expect(await screen.findByText(m.plan_version({ n: 1 }))).toBeTruthy()
  })

  it('shows no attribution for the showcase cities', async () => {
    useScenario('family-warsaw')
    open()
    expect(await screen.findByText(m.plan_version({ n: 1 }))).toBeTruthy()
    expect(screen.queryByRole('link', { name: m.places_osm_attribution() })).toBeNull()
  })
})
