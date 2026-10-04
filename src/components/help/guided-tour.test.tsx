// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { TourTopic } from '@/lib/help'
import { m } from '@/paraglide/messages'
import { GuidedTour } from './guided-tour'

afterEach(cleanup)

const topic: TourTopic = {
  id: 'test',
  title: () => 'Test guide',
  steps: [
    { id: 'one', target: 'one', title: () => 'First', body: () => 'About first' },
    { id: 'gone', target: 'gone', optional: true, title: () => 'Skipped', body: () => 'x' },
    { id: 'two', target: 'missing', title: () => 'Second', body: () => 'About second' },
    { id: 'three', title: () => 'Third', body: () => 'About third' },
  ],
}

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        opener
      </button>
      <div data-tour="one">target one</div>
      <GuidedTour topic={topic} open={open} onOpenChange={setOpen} />
    </>
  )
}

async function openTour() {
  const user = userEvent.setup()
  render(<Harness />)
  const opener = screen.getByRole('button', { name: 'opener' })
  await user.click(opener)
  return { user, opener, dialog: await screen.findByRole('dialog', { name: 'Test guide' }) }
}

describe('GuidedTour', () => {
  it('opens on the first step, rings its target and focuses Next', async () => {
    await openTour()
    expect(screen.getByText('First')).toBeTruthy()
    expect(document.querySelector('[data-slot="tour-spotlight"]')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: m.help_next() }))
    expect(screen.getAllByText(m.help_step_counter({ n: 1, total: 3 })).length).toBeGreaterThan(0)
  })

  it('moves with the arrow keys and skips optional steps without a target', async () => {
    const { user } = await openTour()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Second')).toBeTruthy()
    // A target that is not on the page shows the text without a ring.
    expect(document.querySelector('[data-slot="tour-spotlight"]')).toBeNull()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Third')).toBeTruthy()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Third')).toBeTruthy()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('Second')).toBeTruthy()
  })

  it('walks with the buttons and finishes on the last step', async () => {
    const { user, opener } = await openTour()
    expect(screen.getByRole('button', { name: m.help_back() }).getAttribute('aria-disabled')).toBe(
      'true',
    )
    await user.click(screen.getByRole('button', { name: m.help_next() }))
    await user.click(screen.getByRole('button', { name: m.help_next() }))
    await user.click(screen.getByRole('button', { name: m.help_done() }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('closes on Escape, returns focus, and starts from step one next time', async () => {
    const { user, opener } = await openTour()
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(opener))
    await user.click(opener)
    expect(await screen.findByText('First')).toBeTruthy()
  })

  it('keeps Tab inside the panel', async () => {
    const { user, dialog } = await openTour()
    for (let press = 0; press < 6; press += 1) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('renders nothing without a topic', () => {
    render(<GuidedTour topic={null} open onOpenChange={() => undefined} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
