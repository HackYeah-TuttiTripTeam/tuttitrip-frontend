// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import indexHtml from '../../index.html?raw'
import {
  getTheme,
  initTheme,
  readStoredTheme,
  resolveTheme,
  setTheme,
  THEME_STORAGE_KEY,
} from './theme'

let systemDark = false
const mediaListeners = new Set<() => void>()

function mockMatchMedia() {
  window.matchMedia = vi.fn((query: string) => ({
    matches: systemDark,
    media: query,
    addEventListener: (_: string, fn: () => void) => mediaListeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => mediaListeners.delete(fn),
  })) as unknown as typeof window.matchMedia
}

function setSystem(dark: boolean) {
  systemDark = dark
  for (const fn of mediaListeners) fn()
}

const html = document.documentElement

beforeEach(() => {
  systemDark = false
  mediaListeners.clear()
  localStorage.clear()
  html.className = ''
  html.removeAttribute('style')
  document.head.innerHTML =
    '<meta name="theme-color" content="#light" data-light="#light" data-dark="#dark">'
  mockMatchMedia()
})

afterEach(() => vi.restoreAllMocks())

describe('theme store', () => {
  it('defaults to system and ignores junk in storage', () => {
    expect(readStoredTheme()).toBe('system')
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(readStoredTheme()).toBe('system')
  })

  it('saves a choice, reads it back and applies class, color-scheme and theme-color', () => {
    setTheme('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readStoredTheme()).toBe('dark')
    expect(html.classList.contains('dark')).toBe(true)
    expect(html.style.colorScheme).toBe('dark')
    expect(document.querySelector<HTMLMetaElement>('meta[name=theme-color]')?.content).toBe('#dark')
    setTheme('light')
    expect(html.classList.contains('dark')).toBe(false)
    expect(html.style.colorScheme).toBe('light')
  })

  it('forgets the saved value for system and resolves it from the OS', () => {
    setTheme('dark')
    setTheme('system')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    systemDark = true
    expect(resolveTheme('system')).toBe('dark')
  })

  it('follows the system setting only while the choice is system', () => {
    initTheme()
    setSystem(true)
    expect(html.classList.contains('dark')).toBe(true)
    setTheme('light')
    setSystem(true)
    expect(getTheme()).toBe('light')
    expect(html.classList.contains('dark')).toBe(false)
  })

  it('keeps working when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStoredTheme()).toBe('system')
    expect(() => setTheme('dark')).not.toThrow()
    expect(html.classList.contains('dark')).toBe(true)
  })
})

describe('no-flash script in index.html', () => {
  const source = indexHtml
  const script = /<script>([\s\S]*?)<\/script>/.exec(source)?.[1]

  function run() {
    if (!script) throw new Error('theme script missing from index.html')
    new Function(script)()
  }

  it('is the first script and runs before the app bundle', () => {
    expect(source.indexOf('<script>')).toBeLessThan(source.indexOf('src="/src/main.tsx"'))
  })

  it('sets .dark from a saved dark choice even when the system is light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    run()
    expect(html.classList.contains('dark')).toBe(true)
    expect(html.style.colorScheme).toBe('dark')
    expect(document.querySelector<HTMLMetaElement>('meta[name=theme-color]')?.content).toBe('#dark')
  })

  it('lets a saved light choice win over a dark system', () => {
    systemDark = true
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    run()
    expect(html.classList.contains('dark')).toBe(false)
  })

  it('falls back to the system setting without a saved choice or with blocked storage', () => {
    systemDark = true
    run()
    expect(html.classList.contains('dark')).toBe(true)
    html.className = ''
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    run()
    expect(html.classList.contains('dark')).toBe(true)
  })
})
