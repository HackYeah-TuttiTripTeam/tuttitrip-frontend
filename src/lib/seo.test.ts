import { describe, expect, it } from 'vitest'
import {
  pageSeo,
  pageUrl,
  requestLocale,
  robotsTxt,
  seoHeadHtml,
  seoPath,
  seoTags,
  sitemapXml,
} from './seo'

const ORIGIN = 'https://tuttitrip.example'

describe('seoPath', () => {
  it('knows the public pages, with or without a trailing slash', () => {
    expect(seoPath('/')).toBe('/')
    expect(seoPath('/about/')).toBe('/about')
    expect(seoPath('/contact')).toBe('/contact')
  })

  it('leaves the app and unknown paths out', () => {
    expect(seoPath('/trips')).toBeNull()
    expect(seoPath('/about/x')).toBeNull()
  })
})

describe('requestLocale', () => {
  const url = (search = '') => new URL(`${ORIGIN}/${search}`)

  it('prefers ?lang over the browser language', () => {
    expect(requestLocale(url('?lang=en'), 'pl-PL,pl;q=0.9')).toBe('en')
  })

  it('takes the first supported language of Accept-Language', () => {
    expect(requestLocale(url(), 'de-DE,de;q=0.9,en-GB;q=0.8')).toBe('en')
  })

  it('falls back to Polish', () => {
    expect(requestLocale(url('?lang=xx'), null)).toBe('pl')
    expect(requestLocale(url(), 'fr')).toBe('pl')
  })
})

describe('pageSeo', () => {
  it('gives the base language a clean URL and the others ?lang', () => {
    expect(pageUrl(ORIGIN, '/about', 'pl')).toBe(`${ORIGIN}/about`)
    expect(pageUrl(ORIGIN, '/about', 'en')).toBe(`${ORIGIN}/about?lang=en`)
  })

  it('writes title, description and the share image in the page language', () => {
    const pl = pageSeo(ORIGIN, '/', 'pl')
    const en = pageSeo(ORIGIN, '/', 'en')
    expect(pl.title).toContain('nikt nie czuje')
    expect(en.title).toContain('nobody feels')
    expect(pl.image.url).toBe(`${ORIGIN}/og/og-pl.png`)
    expect(en.image.url).toBe(`${ORIGIN}/og/og-en.png`)
    expect(en.image).toMatchObject({ width: 1200, height: 630 })
  })

  it('lists both languages and x-default as alternates', () => {
    const seo = pageSeo(ORIGIN, '/contact', 'en')
    expect(seo.alternates).toEqual([
      { hreflang: 'pl', href: `${ORIGIN}/contact` },
      { hreflang: 'en', href: `${ORIGIN}/contact?lang=en` },
      { hreflang: 'x-default', href: `${ORIGIN}/contact` },
    ])
    expect(seo.canonical).toBe(`${ORIGIN}/contact?lang=en`)
  })

  it('adds AboutPage only on /about', () => {
    const types = (path: '/' | '/about') =>
      (pageSeo(ORIGIN, path, 'pl').jsonLd['@graph'] as { '@type': string }[]).map((n) => n['@type'])
    expect(types('/')).toEqual(['Organization', 'WebSite'])
    expect(types('/about')).toEqual(['Organization', 'WebSite', 'AboutPage'])
  })
})

describe('seoTags and seoHeadHtml', () => {
  const seo = pageSeo(ORIGIN, '/about', 'en')

  it('sets locale and the alternate locale', () => {
    const { meta } = seoTags(seo)
    expect(meta).toContainEqual({ property: 'og:locale', content: 'en_US' })
    expect(meta).toContainEqual({ property: 'og:locale:alternate', content: 'pl_PL' })
    expect(meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
  })

  it('renders escaped HTML that cannot close the JSON-LD script', () => {
    const html = seoHeadHtml({ ...seo, title: 'A "b" <c> & d', description: '</script>' })
    expect(html).toContain('<title data-seo>A &quot;b&quot; &lt;c&gt; &amp; d</title>')
    expect(html).toContain('content="&lt;/script&gt;"')
    expect(html).toContain(
      '<link data-seo rel="canonical" href="https://tuttitrip.example/about?lang=en">',
    )
    expect(html.match(/<script/g)).toHaveLength(1)
  })
})

describe('crawler files', () => {
  it('lists every public page with its alternates in the sitemap', () => {
    const xml = sitemapXml(ORIGIN)
    expect(xml.match(/<url>/g)).toHaveLength(3)
    expect(xml).toContain(`<loc>${ORIGIN}/about</loc>`)
    expect(xml).toContain(`hreflang="en" href="${ORIGIN}/about?lang=en"`)
  })

  it('keeps crawlers out of the API and the app', () => {
    const robots = robotsTxt(ORIGIN)
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain('Disallow: /trips')
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
  })
})
