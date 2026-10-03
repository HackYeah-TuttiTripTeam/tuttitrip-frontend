import { Laptop, Moon, Sun } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isTheme, type ResolvedTheme, type Theme, themes } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { barItemClass } from './nav-classes'

export interface ThemeState {
  /** The saved choice. */
  theme: Theme
  /** The theme shown right now (differs from `theme` when it is `system`). */
  resolved: ResolvedTheme
  onChange: (theme: Theme) => void
}

const NAMES: Record<Theme, () => string> = {
  light: m.theme_light,
  dark: m.theme_dark,
  system: m.theme_system,
}

const ICONS: Record<Theme, ReactNode> = {
  light: <Sun aria-hidden="true" />,
  dark: <Moon aria-hidden="true" />,
  system: <Laptop aria-hidden="true" />,
}

/** The three choices as radio items; reused inside the mobile account menu. */
export function ThemeRadioGroup({ state }: { state: ThemeState }) {
  return (
    <DropdownMenuRadioGroup
      value={state.theme}
      onValueChange={(value) => isTheme(value) && state.onChange(value)}
    >
      {themes.map((theme) => (
        <DropdownMenuRadioItem key={theme} value={theme} className="min-h-11 md:min-h-8">
          {ICONS[theme]}
          {NAMES[theme]()}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

/**
 * Icon button with a menu: light, dark or system. Drop it into any bar; it only needs the
 * state from `useTheme`. The button shows the theme in use and its name says what is chosen.
 */
export function ThemeToggle({ state }: { state: ThemeState }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(barItemClass, 'size-11 justify-center px-0 md:size-9 [&_svg]:size-5')}
        aria-label={`${m.theme_change()}: ${NAMES[state.theme]()}`}
      >
        {state.resolved === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
          {m.theme_label()}
        </DropdownMenuLabel>
        <ThemeRadioGroup state={state} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
