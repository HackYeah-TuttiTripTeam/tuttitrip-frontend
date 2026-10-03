/**
 * Theme choice: light, dark or follow the system. Stored on the device, applied as the
 * `.dark` class on <html> (the design system switches on it). The inline script in
 * index.html does the same before first paint; this module keeps it in sync afterwards.
 */
export const themes = ['light', 'dark', 'system'] as const
export type Theme = (typeof themes)[number]
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'tuttitrip-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

export const isTheme = (value: unknown): value is Theme => themes.some((theme) => theme === value)

/** Saved choice, or `system` when nothing is saved or storage is blocked. */
export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

function storeTheme(theme: Theme): void {
  try {
    if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage is blocked (private window): the choice lasts until the page closes.
  }
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

/** Sets `.dark`, `color-scheme` and the browser chrome colour (colours live in index.html). */
export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const color = meta?.dataset[resolved]
  if (meta && color) meta.content = color
}

export interface ThemeSnapshot {
  /** The saved choice. */
  theme: Theme
  /** The theme shown right now (differs from `theme` while it is `system`). */
  resolved: ResolvedTheme
}

const listeners = new Set<() => void>()

function snapshotOf(theme: Theme): ThemeSnapshot {
  return { theme, resolved: resolveTheme(theme) }
}

let current: ThemeSnapshot = snapshotOf(readStoredTheme())

/** A new object per commit, so subscribers re-render when only `resolved` changes. */
function commit(theme: Theme): void {
  current = snapshotOf(theme)
  applyTheme(current.resolved)
  for (const listener of listeners) listener()
}

export const getThemeSnapshot = (): ThemeSnapshot => current

export function setTheme(theme: Theme): void {
  storeTheme(theme)
  commit(theme)
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Applies the saved choice and follows the system setting and other tabs.
 * Call once at startup; the returned function removes the listeners.
 */
export function initTheme(): () => void {
  commit(readStoredTheme())
  const media = window.matchMedia?.(DARK_QUERY)
  const onSystem = () => {
    if (current.theme === 'system') commit('system')
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) commit(readStoredTheme())
  }
  media?.addEventListener('change', onSystem)
  window.addEventListener('storage', onStorage)
  return () => {
    media?.removeEventListener('change', onSystem)
    window.removeEventListener('storage', onStorage)
  }
}
