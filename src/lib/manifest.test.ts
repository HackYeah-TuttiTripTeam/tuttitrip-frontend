import { describe, expect, it } from 'vitest'
import { localizedManifest } from './manifest'

const base = { name: 'TuttiTrip', description: 'x', lang: 'pl', icons: [{ src: 'a.png' }] }

describe('localizedManifest', () => {
  it('swaps description and lang, keeps the rest', () => {
    const en = localizedManifest(base, 'en')
    expect(en.lang).toBe('en')
    expect(en.description).toContain('Group trip planning')
    expect(en.name).toBe('TuttiTrip')
    expect(en.icons).toEqual(base.icons)
    expect(localizedManifest(base, 'pl').description).toContain('Planowanie wyjazdów')
  })
})
