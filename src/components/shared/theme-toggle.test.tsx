// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { m } from '@/paraglide/messages'
import { ThemeToggle } from './theme-toggle'

afterEach(cleanup)

describe('ThemeToggle', () => {
  it('names the button after the current choice and lists the three themes', async () => {
    const onChange = vi.fn()
    render(<ThemeToggle state={{ theme: 'system', resolved: 'dark', onChange }} />)
    const button = screen.getByRole('button', { name: new RegExp(m.theme_system()) })
    expect(button.className).toContain('size-11')

    await userEvent.click(button)
    const items = screen.getAllByRole('menuitemradio')
    expect(items.map((item) => item.textContent)).toEqual([
      m.theme_light(),
      m.theme_dark(),
      m.theme_system(),
    ])
    expect(
      screen.getByRole('menuitemradio', { name: m.theme_system() }).getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('works from the keyboard and reports the pick', async () => {
    const onChange = vi.fn()
    render(<ThemeToggle state={{ theme: 'light', resolved: 'light', onChange }} />)
    screen.getByRole('button').focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(screen.getByRole('menuitemradio', { name: m.theme_dark() }))
    expect(onChange).toHaveBeenCalledWith('dark')
  })
})
