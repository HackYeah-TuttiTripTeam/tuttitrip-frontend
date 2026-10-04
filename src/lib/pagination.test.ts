import { describe, expect, it } from 'vitest'
import { pageItems } from './pagination'

describe('pageItems', () => {
  it('lists every page when there are few', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3])
    expect(pageItems(2, 1)).toEqual([1])
  })
  it('collapses far pages into a gap', () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 'gap', 10])
    expect(pageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10])
    expect(pageItems(10, 10)).toEqual([1, 'gap', 9, 10])
  })
  it('does not hide a single page behind a gap', () => {
    expect(pageItems(4, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10])
  })
})
