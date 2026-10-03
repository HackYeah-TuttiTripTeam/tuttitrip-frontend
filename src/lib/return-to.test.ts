import { describe, expect, it } from 'vitest'
import { returnToPath } from './return-to'

const ORIGIN = 'https://app.test'

describe('returnToPath', () => {
  it('returns the page the login started from, with its search', () => {
    expect(returnToPath('/trips/3f0c2a52', ORIGIN)).toBe('/trips/3f0c2a52')
    expect(returnToPath('/trips?q=krakow&sort=name', ORIGIN)).toBe('/trips?q=krakow&sort=name')
    expect(returnToPath('/', ORIGIN)).toBe('/')
  })

  it('falls back to the trips list for a missing or foreign target', () => {
    expect(returnToPath(undefined, ORIGIN)).toBe('/trips')
    expect(returnToPath(42, ORIGIN)).toBe('/trips')
    expect(returnToPath('https://evil.example/trips', ORIGIN)).toBe('/trips')
    expect(returnToPath('//evil.example', ORIGIN)).toBe('/trips')
    expect(returnToPath('/\\evil.example', ORIGIN)).toBe('/trips')
    expect(returnToPath('/\t/evil.example', ORIGIN)).toBe('/trips')
    expect(returnToPath('/\n/evil.example', ORIGIN)).toBe('/trips')
    expect(returnToPath('https://app.test/trips', ORIGIN)).toBe('/trips')
  })
})
