import { useSyncExternalStore } from 'react'

/** Matches Tailwind's md breakpoint (48rem). */
export const DESKTOP_QUERY = '(min-width: 48rem)'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
