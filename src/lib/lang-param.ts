import { isLocale } from '@/lib/seo'
import { type Locale, setLocale } from '@/paraglide/runtime'

/**
 * The language a link asks for: `?lang=en`, the form of the hreflang and share URLs
 * (lib/seo.ts). Returns the URL without the parameter, and the language when it is valid.
 */
export function readLangParam(href: string): { locale: Locale | null; clean: string } {
  const url = new URL(href)
  const locale = url.searchParams.get('lang')
  url.searchParams.delete('lang')
  return { locale: isLocale(locale) ? locale : null, clean: url.pathname + url.search + url.hash }
}

/**
 * Applies `?lang=` before the router reads the URL: stores the language (Paraglide's
 * localStorage strategy, so it sticks like a choice in the language menu) and drops the
 * parameter, so a later change in the menu is not overridden by the old link.
 */
export function applyLangParam(): void {
  if (!window.location.search.includes('lang=')) return
  const { locale, clean } = readLangParam(window.location.href)
  if (locale) void setLocale(locale, { reload: false })
  window.history.replaceState(window.history.state, '', clean)
}
