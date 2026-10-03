import { describe, expect, it } from 'vitest'
import { returnToPath } from './return-to'

describe('returnToPath', () => {
  it('returns the page the login started from, with its search', () => {
    expect(returnToPath('/trips/3f0c2a52')).toBe('/trips/3f0c2a52')
    expect(returnToPath('/trips?q=krakow&sort=name')).toBe('/trips?q=krakow&sort=name')
    expect(returnToPath('/')).toBe('/')
  })

  it('falls back to the trips list for a missing or foreign target', () => {
    expect(returnToPath(undefined)).toBe('/trips')
    expect(returnToPath(42)).toBe('/trips')
    expect(returnToPath('https://evil.example/trips')).toBe('/trips')
    expect(returnToPath('//evil.example')).toBe('/trips')
    expect(returnToPath('/\\evil.example')).toBe('/trips')
  })
})
