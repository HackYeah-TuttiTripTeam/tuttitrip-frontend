// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { setTheme } from '@/lib/theme'
import { useTheme } from './use-theme'

beforeEach(() => {
  window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia
  localStorage.clear()
  setTheme('system')
})

describe('useTheme', () => {
  it('re-renders when the theme changes and reports the shown theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current).toMatchObject({ theme: 'system', resolved: 'light' })
    act(() => result.current.setTheme('dark'))
    expect(result.current).toMatchObject({ theme: 'dark', resolved: 'dark' })
    expect(localStorage.getItem('tuttitrip-theme')).toBe('dark')
  })
})
