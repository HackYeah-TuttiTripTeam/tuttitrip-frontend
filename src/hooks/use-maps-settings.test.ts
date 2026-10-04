// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { setTheme } from '@/lib/theme'
import { useMapsSettings } from './use-maps-settings'

afterEach(() => act(() => setTheme('system')))

describe('useMapsSettings', () => {
  it('gives the map the dark scheme in the dark theme and the light one otherwise', () => {
    const { result } = renderHook(() => useMapsSettings())
    act(() => setTheme('light'))
    expect(result.current.colorScheme).toBe('LIGHT')
    act(() => setTheme('dark'))
    expect(result.current.colorScheme).toBe('DARK')
  })

  it('has no config without the Google key, so the UI says "Mapa niedostępna"', () => {
    const { result } = renderHook(() => useMapsSettings())
    expect(result.current.config).toBeNull()
  })

  it('passes the UI language to Google', () => {
    const { result } = renderHook(() => useMapsSettings())
    expect(result.current.language).toBe('pl')
  })
})
