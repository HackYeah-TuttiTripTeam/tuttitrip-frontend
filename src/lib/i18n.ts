import { m } from '@/paraglide/messages'
import { getLocale, locales, setLocale } from '@/paraglide/runtime'

export type Locale = (typeof locales)[number]
export { getLocale, locales }

/** Switches the language. Paraglide stores the choice and reloads the document. */
export function changeLocale(locale: Locale): void {
  if (locale !== getLocale()) void setLocale(locale)
}

/** `<html lang>` and the page description follow the chosen language. */
export function syncDocumentLanguage(): void {
  document.documentElement.lang = getLocale()
  document.querySelector('meta[name="description"]')?.setAttribute('content', m.app_description())
}
