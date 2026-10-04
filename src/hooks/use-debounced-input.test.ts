// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedInput } from './use-debounced-input'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedInput', () => {
  it('commits once, 300 ms after the typing stops', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useDebouncedInput('', onCommit))

    act(() => result.current.setDraft('r'))
    act(() => vi.advanceTimersByTime(200))
    act(() => result.current.setDraft('rome'))
    act(() => vi.advanceTimersByTime(299))
    expect(onCommit).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(onCommit.mock.calls).toEqual([['rome']])
  })

  it('takes a value changed from outside (Back, clear filters)', () => {
    const onCommit = vi.fn()
    const { result, rerender } = renderHook(({ value }) => useDebouncedInput(value, onCommit), {
      initialProps: { value: 'rome' },
    })
    rerender({ value: '' })
    expect(result.current.draft).toBe('')
    act(() => vi.advanceTimersByTime(1000))
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('clears at once, without waiting', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useDebouncedInput('rome', onCommit))
    act(() => result.current.clear())
    expect(result.current.draft).toBe('')
    expect(onCommit.mock.calls).toEqual([['']])
  })
})
