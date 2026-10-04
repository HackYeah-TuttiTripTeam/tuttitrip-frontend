// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// No Google key in the test environment, like a build without VITE_GOOGLE_MAPS_API_KEY.
describe('Plan without a Google Maps key', () => {
  it('shows the list and "Mapa niedostępna" instead of an error', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan&view=map`)
    expect(await screen.findByRole('heading', { name: /Zamek Królewski/ })).toBeTruthy()
    expect(screen.getByText(m.plan_map_unavailable())).toBeTruthy()
    expect(screen.queryByRole('radio', { name: m.plan_view_map() })).toBeNull()
    expect(screen.queryByRole('button', { name: new RegExp(m.place_card_open()) })).toBeNull()
  })
})
