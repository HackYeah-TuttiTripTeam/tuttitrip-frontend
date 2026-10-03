import { describe, expect, it } from 'vitest'
import { readLangParam } from './lang-param'

describe('readLangParam', () => {
  it('reads a valid language and drops the parameter', () => {
    expect(readLangParam('https://x.test/about?lang=en')).toEqual({ locale: 'en', clean: '/about' })
  })

  it('keeps other parameters and the hash', () => {
    expect(readLangParam('https://x.test/?a=1&lang=pl#how')).toEqual({
      locale: 'pl',
      clean: '/?a=1#how',
    })
  })

  it('ignores a language the app does not have, but still drops it', () => {
    expect(readLangParam('https://x.test/?lang=de')).toEqual({ locale: null, clean: '/' })
  })
})
