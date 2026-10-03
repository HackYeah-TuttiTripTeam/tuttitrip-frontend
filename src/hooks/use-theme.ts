import { useSyncExternalStore } from 'react'
import { getThemeSnapshot, setTheme, subscribeTheme, type ThemeSnapshot } from '@/lib/theme'

/** The saved theme choice (`system` by default), the theme actually shown, and a setter. */
export function useTheme(): ThemeSnapshot & { setTheme: typeof setTheme } {
  const snapshot = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeSnapshot)
  return { ...snapshot, setTheme }
}
