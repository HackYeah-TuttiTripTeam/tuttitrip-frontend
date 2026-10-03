// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './theme-toggle'

afterEach(cleanup)

describe('ThemeToggle', () => {
  it('names the button after the current choice and lists the three themes', async () => {
    const onChange = vi.fn()
    render(<ThemeToggle state={{ theme: 'system', resolved: 'dark', onChange }} />)
    const button = screen.getByRole('button', { name: /System/ })
    expect(button.className).toContain('size-11')

    await userEvent.click(button)
    const items = screen.getAllByRole('menuitemradio')
    expect(items.map((item) => item.textContent)).toEqual(['Light', 'Dark', 'System'])
    expect(screen.getByRole('menuitemradio', { name: 'System' }).getAttribute('aria-checked')).toBe(
      'true',
    )
  })

  it('works from the keyboard and reports the pick', async () => {
    const onChange = vi.fn()
    render(<ThemeToggle state={{ theme: 'light', resolved: 'light', onChange }} />)
    screen.getByRole('button').focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Dark' }))
    expect(onChange).toHaveBeenCalledWith('dark')
  })
})
