// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initTheme, setTheme } from '@/lib/theme'
import { useTheme } from './use-theme'

let systemDark = false
const listeners = new Set<() => void>()
let stop: (() => void) | undefined

beforeEach(() => {
  systemDark = false
  listeners.clear()
  window.matchMedia = (() => ({
    get matches() {
      return systemDark
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  })) as unknown as typeof window.matchMedia
  localStorage.clear()
  setTheme('system')
})

afterEach(() => stop?.())

describe('useTheme', () => {
  it('re-renders when the theme changes and reports the shown theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current).toMatchObject({ theme: 'system', resolved: 'light' })
    act(() => result.current.setTheme('dark'))
    expect(result.current).toMatchObject({ theme: 'dark', resolved: 'dark' })
    expect(localStorage.getItem('tuttitrip-theme')).toBe('dark')
  })

  it('updates `resolved` when the OS theme flips while the choice is system', () => {
    stop = initTheme()
    const { result } = renderHook(() => useTheme())
    expect(result.current).toMatchObject({ theme: 'system', resolved: 'light' })
    act(() => {
      systemDark = true
      for (const fn of listeners) fn()
    })
    expect(result.current).toMatchObject({ theme: 'system', resolved: 'dark' })
  })
})
