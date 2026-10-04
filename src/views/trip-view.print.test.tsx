// @vitest-environment jsdom
import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The first render in a file pays for the cold module graph; a loaded CI box needs more than 1 s.
const SLOW = { timeout: 8000 }

afterEach(() => {
  document.documentElement.classList.remove('dark')
  vi.restoreAllMocks()
})

const beforePrint = () => act(() => void window.dispatchEvent(new Event('beforeprint')))
const afterPrint = () => act(() => void window.dispatchEvent(new Event('afterprint')))

describe('Plan printout', () => {
  it('opens the print dialog from the "Print or save as PDF" button', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    fireEvent.click(await screen.findByRole('button', { name: m.plan_print() }, SLOW))
    expect(print).toHaveBeenCalledOnce()
  })

  it('renders every day with times and stops only while printing', async () => {
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await screen.findByRole('button', { name: m.plan_print() }, SLOW)
    expect(document.querySelector('article')).toBeNull()

    beforePrint()
    const printout = document.querySelector('article')
    if (!printout) throw new Error('no printout')
    const view = within(printout)
    // Both days at once, not only the open tab, each as a section that starts a page.
    expect(view.getByRole('heading', { name: /Dzień 1/ })).toBeTruthy()
    expect(view.getByRole('heading', { name: /Dzień 2/ })).toBeTruthy()
    expect(view.getByText('Zamek Królewski')).toBeTruthy()
    expect(view.getAllByText(/^\d{2}:\d{2}$/).length).toBeGreaterThan(1)
    expect(view.getByText(m.plan_print_footer({ n: 1 }))).toBeTruthy()
    expect(printout.querySelector('div[class*="break-before-page"]')).toBeTruthy()
    // Plain text, no interactive elements, no map.
    expect(view.queryByRole('button')).toBeNull()
    expect(view.queryByRole('tablist')).toBeNull()

    afterPrint()
    expect(document.querySelector('article')).toBeNull()
  })

  it('prints light even when the app is dark, and restores the theme afterwards', async () => {
    document.documentElement.classList.add('dark')
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await screen.findByRole('button', { name: m.plan_print() }, SLOW)

    beforePrint()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    afterPrint()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('has no print button when there is no plan', async () => {
    useScenario('no-plan')
    renderApp(`/trips/${TRIP_ID}?tab=plan`)
    await screen.findByText(m.plan_empty_title())
    expect(screen.queryByRole('button', { name: m.plan_print() })).toBeNull()
  })
})
