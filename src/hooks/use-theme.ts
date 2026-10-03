import { useSyncExternalStore } from 'react'
import {
  getTheme,
  type ResolvedTheme,
  resolveTheme,
  setTheme,
  subscribeTheme,
  type Theme,
} from '@/lib/theme'

/** The saved theme choice (`system` by default), the theme actually shown, and a setter. */
export function useTheme(): {
  theme: Theme
  resolved: ResolvedTheme
  setTheme: (theme: Theme) => void
} {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme)
  return { theme, resolved: resolveTheme(theme), setTheme }
}
