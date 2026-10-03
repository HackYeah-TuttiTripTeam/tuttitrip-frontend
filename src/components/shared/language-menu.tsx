import { Globe } from '@keyline-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Locale, locales } from '@/lib/i18n'
import { m } from '@/paraglide/messages'
import { barItemClass } from './nav-classes'

export interface LanguageState {
  locale: Locale
  onChange: (locale: Locale) => void
}

/** Language names are written in their own language, so they stay readable after a wrong pick. */
const NAMES: Record<Locale, () => string> = {
  pl: m.language_name_pl,
  en: m.language_name_en,
}

const isLocale = (value: string): value is Locale => locales.some((locale) => locale === value)

/** Always-visible language switch in the top bar, so guests and signed-in users find it in one place. */
export function LanguageMenu({ language }: { language: LanguageState }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`${barItemClass} h-11 md:h-9`}
        // The visible code ("PL") leads the accessible name (WCAG 2.5.3 label in name).
        aria-label={`${language.locale.toUpperCase()}, ${m.language_change()}: ${NAMES[language.locale]()}`}
      >
        <Globe aria-hidden="true" className="size-5" />
        <span aria-hidden="true" className="font-medium text-xs uppercase">
          {language.locale}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
          {m.language_label()}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={language.locale}
          onValueChange={(value) => isLocale(value) && language.onChange(value)}
        >
          {locales.map((locale) => (
            <DropdownMenuRadioItem
              key={locale}
              value={locale}
              lang={locale}
              className="min-h-11 md:min-h-8"
            >
              {NAMES[locale]()}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
