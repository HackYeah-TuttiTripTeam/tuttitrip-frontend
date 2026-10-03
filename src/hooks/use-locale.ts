import { changeLocale, getLocale, type Locale } from '@/lib/i18n'

/**
 * Current UI language and a setter. Changing it stores the choice and reloads the
 * document (Paraglide's default), so no component needs to subscribe to it.
 */
export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  return { locale: getLocale(), setLocale: changeLocale }
}
