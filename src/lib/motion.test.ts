import { describe, expect, it } from 'vitest'
import { clamp01, scrollProgress } from './motion'

describe('clamp01', () => {
  it('keeps values inside 0..1', () => {
    expect([-1, 0, 0.4, 1, 3].map(clamp01)).toEqual([0, 0, 0.4, 1, 1])
  })
})

describe('scrollProgress', () => {
  const viewport = 1000

  it('is 0 while the block is still below the start line', () => {
    expect(scrollProgress({ top: 900, height: 400 }, viewport)).toBe(0)
  })

  it('is 1 once the block has passed the end line', () => {
    expect(scrollProgress({ top: -300, height: 400 }, viewport)).toBe(1)
  })

  it('grows while the block moves up', () => {
    const early = scrollProgress({ top: 700, height: 400 }, viewport)
    const late = scrollProgress({ top: 300, height: 400 }, viewport)
    expect(early).toBeGreaterThan(0)
    expect(late).toBeGreaterThan(early)
    expect(late).toBeLessThan(1)
  })
})
