// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { cssColorToRgb, tokenColor } from './css-color'

describe('css colour as rgb', () => {
  it('falls back where there is no canvas (jsdom)', () => {
    expect(cssColorToRgb('oklch(50% 0.12 162)', 'rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)')
  })

  it('falls back for a token that is not defined', () => {
    expect(tokenColor('--no-such-token', 'rgb(4, 5, 6)')).toBe('rgb(4, 5, 6)')
  })
})
