import { pageSeo, type SeoPath, seoTags } from '@/lib/seo'
import { getLocale } from '@/paraglide/runtime'

/**
 * Route `head` of a public page: title, description, canonical, hreflang, Open Graph, Twitter
 * and JSON-LD in the current language. The Worker injects the same tags for bots that do not
 * run JavaScript (worker/index.ts); this keeps them right after client-side navigation.
 */
export function publicHead(path: SeoPath) {
  const seo = pageSeo(window.location.origin, path, getLocale())
  const { meta, links } = seoTags(seo)
  return {
    meta: [{ title: seo.title }, ...meta],
    links,
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(seo.jsonLd) }],
  }
}
