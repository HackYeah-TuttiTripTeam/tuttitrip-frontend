import { describe, expect, it } from 'vitest'
import { m } from '@/paraglide/messages'
import { shellHtml } from './seo-shell'

describe('shellHtml', () => {
  it('puts the headline of each page in its language', () => {
    expect(shellHtml('/', 'pl')).toContain(`>${m.home_title({}, { locale: 'pl' })}</h1>`)
    expect(shellHtml('/about', 'en')).toContain(`>${m.about_title({}, { locale: 'en' })}</h1>`)
    expect(shellHtml('/contact', 'pl')).toContain(`>${m.contact_title({}, { locale: 'pl' })}</h1>`)
  })

  it('points to photo files that keep their names in a build', () => {
    expect(shellHtml('/about', 'pl')).toContain('/assets/photos/rodzina-na-sciezce-800.webp')
    expect(shellHtml('/contact', 'pl')).toContain('/assets/photos/zespol-640.avif 640w')
  })

  it('loads the first photo with high priority and gives it a size', () => {
    const html = shellHtml('/about', 'pl')
    expect(html).toContain('fetchpriority="high"')
    expect(html).toMatch(/width="1200" height="1500"/)
  })

  it('hides itself for a browser with a stored session, on the landing page only', () => {
    expect(shellHtml('/', 'pl')).toContain('@@auth0spajs@@')
    expect(shellHtml('/about', 'pl')).not.toContain('@@auth0spajs@@')
  })
})
