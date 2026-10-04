// @vitest-environment jsdom
import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

function mockOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
}

function setOnline(online: boolean) {
  mockOnline(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('offline banner', () => {
  it('says there is no connection while offline and goes away when the network is back', async () => {
    useScenario('offline')
    renderApp('/trips')
    // The view says the API is unreachable; the banner says why: the device is offline.
    await screen.findByText(m.trips_offline_title())
    expect(screen.queryByText(m.shell_offline_text())).toBeNull()

    setOnline(false)
    expect(screen.getByText(m.shell_offline_text()).closest('[role="status"]')).not.toBeNull()

    setOnline(true)
    expect(screen.queryByText(m.shell_offline_text())).toBeNull()
  })

  it('shows the message when the app starts offline', async () => {
    useScenario('offline')
    mockOnline(false)
    renderApp('/trips')
    expect(await screen.findByText(m.shell_offline_text())).toBeTruthy()
  })
})
