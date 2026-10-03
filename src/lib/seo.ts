// Search and share metadata of the public pages. One source for two consumers:
//   - the Worker (worker/index.ts) injects it with HTMLRewriter, so bots that do not run
//     JavaScript (link previews in messengers, crawlers) see the right tags;
//   - the router (`head` of each public route, via loaders/seo.ts) keeps the tags right
//     after client-side navigation.
// It is framework-free and imports only Paraglide, so both bundles can use it.
import { m } from '../paraglide/messages'
import { baseLocale, type Locale, locales } from '../paraglide/runtime'

export const SEO_PATHS = ['/', '/about', '/contact'] as const
export type SeoPath = (typeof SEO_PATHS)[number]

const SITE_NAME = 'TuttiTrip'
const GITHUB_ORG_URL = 'https://github.com/HackYeah-TuttiTripTeam'
/** Share image size (Open Graph and Twitter large card). */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const
/** Locale tags Open Graph wants (`og:locale`). */
const OG_LOCALE: Record<Locale, string> = { pl: 'pl_PL', en: 'en_US' }

/** The public path a URL pathname stands for, or null for pages that are not indexed. */
export function seoPath(pathname: string): SeoPath | null {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return SEO_PATHS.find((path) => path === trimmed) ?? null
}

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.some((locale) => locale === value)
}

/**
 * Language of a request for bots and first paint: `?lang=` wins, then the first supported
 * language of Accept-Language (what Paraglide's `preferredLanguage` strategy does in the
 * browser), then the base locale.
 */
export function requestLocale(url: URL, acceptLanguage: string | null): Locale {
  const fromQuery = url.searchParams.get('lang')
  if (isLocale(fromQuery)) return fromQuery
  for (const part of (acceptLanguage ?? '').split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase().split('-')[0]
    if (isLocale(tag)) return tag
  }
  return baseLocale
}

/** Absolute URL of a page in a language. The base locale has the clean URL, the others `?lang=`. */
export function pageUrl(origin: string, path: SeoPath, locale: Locale): string {
  const url = `${origin}${path}`
  return locale === baseLocale ? url : `${url}?lang=${locale}`
}

type Messages = Record<SeoPath, { title: () => string; description: () => string }>

/** Messages are read per call, in the locale of the page (never at import time). */
function textsFor(locale: Locale): Messages {
  const options = { locale }
  return {
    '/': {
      title: () => m.seo_home_title({}, options),
      description: () => m.seo_home_description({}, options),
    },
    '/about': {
      title: () => m.seo_about_title({}, options),
      description: () => m.seo_about_description({}, options),
    },
    '/contact': {
      title: () => m.seo_contact_title({}, options),
      description: () => m.seo_contact_description({}, options),
    },
  }
}

export interface PageSeo {
  locale: Locale
  title: string
  description: string
  canonical: string
  alternates: { hreflang: string; href: string }[]
  image: { url: string; alt: string } & typeof OG_IMAGE_SIZE
  /** schema.org graph for the page (Organization and WebSite everywhere, AboutPage on /about). */
  jsonLd: Record<string, unknown>
}

export function pageSeo(origin: string, path: SeoPath, locale: Locale): PageSeo {
  const texts = textsFor(locale)[path]
  const title = texts.title()
  const description = texts.description()
  const canonical = pageUrl(origin, path, locale)

  const organization = {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: SITE_NAME,
    url: `${origin}/`,
    logo: `${origin}/pwa-512x512.png`,
    sameAs: [GITHUB_ORG_URL],
  }
  const website = {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: SITE_NAME,
    url: `${origin}/`,
    inLanguage: locale,
    publisher: { '@id': organization['@id'] },
  }
  const graph: Record<string, unknown>[] = [organization, website]
  if (path === '/about') {
    graph.push({
      '@type': 'AboutPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      inLanguage: locale,
      isPartOf: { '@id': website['@id'] },
      about: { '@id': organization['@id'] },
    })
  }

  return {
    locale,
    title,
    description,
    canonical,
    alternates: [
      ...locales.map((hreflang) => ({ hreflang, href: pageUrl(origin, path, hreflang) })),
      { hreflang: 'x-default', href: pageUrl(origin, path, baseLocale) },
    ],
    image: {
      url: `${origin}/og/og-${locale}.png`,
      alt: m.seo_image_alt({}, { locale }),
      ...OG_IMAGE_SIZE,
    },
    jsonLd: { '@context': 'https://schema.org', '@graph': graph },
  }
}

export type MetaTag = { name: string; content: string } | { property: string; content: string }
export interface LinkTag {
  rel: string
  href: string
  hreflang?: string
}

/** Every meta and link tag of a page, as plain data (the router and the Worker render it). */
export function seoTags(seo: PageSeo): { meta: MetaTag[]; links: LinkTag[] } {
  const others = locales.filter((locale) => locale !== seo.locale)
  return {
    meta: [
      { name: 'description', content: seo.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: seo.title },
      { property: 'og:description', content: seo.description },
      { property: 'og:url', content: seo.canonical },
      { property: 'og:locale', content: OG_LOCALE[seo.locale] },
      ...others.map((locale) => ({
        property: 'og:locale:alternate',
        content: OG_LOCALE[locale],
      })),
      { property: 'og:image', content: seo.image.url },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: String(seo.image.width) },
      { property: 'og:image:height', content: String(seo.image.height) },
      { property: 'og:image:alt', content: seo.image.alt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: seo.title },
      { name: 'twitter:description', content: seo.description },
      { name: 'twitter:image', content: seo.image.url },
      { name: 'twitter:image:alt', content: seo.image.alt },
    ],
    links: [
      { rel: 'canonical', href: seo.canonical },
      ...seo.alternates.map(({ hreflang, href }) => ({ rel: 'alternate', hreflang, href })),
    ],
  }
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}
const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char)

/** JSON for an inline script: `<` is escaped so the data can never close the tag. */
const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

/** The tags as HTML for the Worker. Every tag carries `data-seo` so the client can find it. */
export function seoHeadHtml(seo: PageSeo): string {
  const { meta, links } = seoTags(seo)
  const parts = [
    `<title data-seo>${escapeHtml(seo.title)}</title>`,
    ...meta.map((tag) => {
      const key = 'name' in tag ? `name="${tag.name}"` : `property="${tag.property}"`
      return `<meta data-seo ${key} content="${escapeHtml(tag.content)}">`
    }),
    ...links.map(
      (tag) =>
        `<link data-seo rel="${tag.rel}"${tag.hreflang ? ` hreflang="${tag.hreflang}"` : ''} href="${escapeHtml(tag.href)}">`,
    ),
    `<script data-seo type="application/ld+json">${scriptJson(seo.jsonLd)}</script>`,
  ]
  return parts.join('')
}

/** XML for /sitemap.xml: every public page once, with its language alternates. */
export function sitemapXml(origin: string): string {
  const entries = SEO_PATHS.map((path) => {
    const alternates = [
      ...locales.map((hreflang) => ({ hreflang, href: pageUrl(origin, path, hreflang) })),
      { hreflang: 'x-default', href: pageUrl(origin, path, baseLocale) },
    ]
      .map(
        ({ hreflang, href }) =>
          `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}"/>`,
      )
      .join('\n')
    return `  <url>\n    <loc>${escapeHtml(pageUrl(origin, path, baseLocale))}</loc>\n${alternates}\n  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`
}

/**
 * robots.txt. Production: public pages open, the API and the signed-in app not for crawlers, with
 * the sitemap. Any other deployment (develop, previews) is closed to all, with no sitemap.
 */
export function robotsTxt(origin: string, indexable = true): string {
  if (!indexable) return ['User-agent: *', 'Disallow: /', ''].join('\n')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /trips',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
}
