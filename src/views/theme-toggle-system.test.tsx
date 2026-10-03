// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { useTheme } from '@/hooks/use-theme'
import { initTheme, setTheme } from '@/lib/theme'

afterEach(cleanup)

describe('ThemeToggle with the OS theme', () => {
  it('swaps the trigger icon when the system theme flips', () => {
    let systemDark = false
    const listeners = new Set<() => void>()
    window.matchMedia = (() => ({
      get matches() {
        return systemDark
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })) as unknown as typeof window.matchMedia
    setTheme('system')
    const stop = initTheme()
    function Harness() {
      const { theme, resolved, setTheme } = useTheme()
      return <ThemeToggle state={{ theme, resolved, onChange: setTheme }} />
    }
    render(<Harness />)
    expect(screen.getByRole('button').getAttribute('data-resolved')).toBe('light')
    act(() => {
      systemDark = true
      for (const fn of listeners) fn()
    })
    expect(screen.getByRole('button').getAttribute('data-resolved')).toBe('dark')
    stop()
  })
})
