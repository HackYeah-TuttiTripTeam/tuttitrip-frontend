import { describe, expect, it } from 'vitest'
import { countryName, nameFromSlug, placeLabel } from './city-search'

describe('names of a stored place', () => {
  it('makes a readable name of a slug', () => {
    expect(nameFromSlug('lisboa-portugal')).toBe('Lisboa Portugal')
    expect(nameFromSlug('')).toBe('')
  })

  it('prefers the destination, falls back to the slug', () => {
    expect(placeLabel(' Lisboa ', 'lisboa-portugal')).toBe('Lisboa')
    expect(placeLabel('', 'krakow')).toBe('Krakow')
    expect(placeLabel('', '')).toBe('')
  })

  it('names a country in the UI language', () => {
    expect(countryName('PT', 'pl')).toBe('Portugalia')
    expect(countryName('PT', 'en')).toBe('Portugal')
    expect(countryName('??', 'pl')).toBe('??')
  })
})
