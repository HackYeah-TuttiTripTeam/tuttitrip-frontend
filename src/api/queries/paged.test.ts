import { describe, expectTypeOf, it } from 'vitest'
import type { Schemas } from '@/api/client'
import type { Page } from './paged'

describe('Page<T>', () => {
  it('matches the page envelope generated from the API schema', () => {
    expectTypeOf<Page<Schemas['SearchOpeningRead']>>().toEqualTypeOf<
      Schemas['Page_SearchOpeningRead_']
    >()
  })
})
