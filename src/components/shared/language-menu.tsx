import { Globe } from '@keyline-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { m } from '@/paraglide/messages'
import { barItemClass } from './nav-classes'

export type UiLocale = 'pl' | 'en'

export interface LanguageState {
  locale: UiLocale
  onChange: (locale: UiLocale) => void
}

/** Language names are written in their own language, so they stay readable after a wrong pick. */
const NAMES: Record<UiLocale, () => string> = {
  pl: m.language_name_pl,
  en: m.language_name_en,
}

const isUiLocale = (value: string): value is UiLocale => value in NAMES

/** Radio items for the dropdown content; shared by the language menu and the account menu. */
export function LanguageOptions({ language }: { language: LanguageState }) {
  return (
    <>
      <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
        {m.language_label()}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={language.locale}
        onValueChange={(value) => isUiLocale(value) && language.onChange(value)}
      >
        {Object.entries(NAMES).map(([locale, name]) => (
          <DropdownMenuRadioItem
            key={locale}
            value={locale}
            lang={locale}
            className="min-h-11 md:min-h-8"
          >
            {name()}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}

/** Always-visible language switch in the top bar, so guests can change it too. */
export function LanguageMenu({ language }: { language: LanguageState }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`${barItemClass} h-11 md:h-9`}
        aria-label={`${m.language_change()}: ${NAMES[language.locale]()}`}
      >
        <Globe aria-hidden="true" className="size-5" />
        <span className="font-medium text-xs uppercase">{language.locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <LanguageOptions language={language} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
