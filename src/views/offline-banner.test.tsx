// @vitest-environment jsdom
import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

function goOffline(offline: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(!offline)
  act(() => {
    window.dispatchEvent(new Event(offline ? 'offline' : 'online'))
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

    goOffline(true)
    expect(screen.getByText(m.shell_offline_text()).closest('[role="status"]')).not.toBeNull()

    goOffline(false)
    expect(screen.queryByText(m.shell_offline_text())).toBeNull()
  })
})
