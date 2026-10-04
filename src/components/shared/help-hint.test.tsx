// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HELP_HINTS, type HelpHintId } from '@/lib/help-hints'
import { m } from '@/paraglide/messages'
import { HelpHint } from './help-hint'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function stubPointer(fine: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: fine,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const TOPICS = Object.keys(HELP_HINTS) as HelpHintId[]

describe('HelpHint', () => {
  it('names the button after the topic and has a 44px hit area on touch', () => {
    stubPointer(false)
    render(<HelpHint id="floor" />)
    const button = screen.getByRole('button', {
      name: m.help_trigger_label({ topic: m.help_floor_title() }),
    })
    expect(button.className).toContain('pointer-coarse:before:-inset-2.5')
  })

  it('opens a popover on tap with the title and the text (touch)', async () => {
    stubPointer(false)
    render(<HelpHint id="alpha" />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog').textContent).toContain(m.help_alpha_body())
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens a tooltip on keyboard focus and closes it on Esc (precise pointer)', async () => {
    stubPointer(true)
    render(<HelpHint id="jain" />)
    await userEvent.tab()
    const tips = await screen.findAllByRole('tooltip')
    expect(tips[0]?.textContent).toContain(m.help_jain_body())
    expect(screen.getByRole('button').getAttribute('aria-describedby')).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it.each(TOPICS)('has a title and a short text for %s', (id) => {
    const hint = HELP_HINTS[id]
    expect(hint.title().length).toBeGreaterThan(2)
    expect(hint.body().length).toBeGreaterThan(20)
    expect(hint.body().length).toBeLessThan(260)
  })
})
