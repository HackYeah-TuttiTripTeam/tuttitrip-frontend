import { type MapsConfig, mapsConfig } from '@/lib/env'
import { getLocale } from '@/paraglide/runtime'
import { useTheme } from './use-theme'

export type MapColorScheme = 'LIGHT' | 'DARK'

export interface MapsSettings {
  /** Null when the key or map id is missing: show "Mapa niedostępna" instead of a map. */
  config: MapsConfig | null
  colorScheme: MapColorScheme
  /** Language of the labels on the map and of the place card. */
  language: string
}

/** Everything a Google map or a place card needs from the environment, theme and language. */
export function useMapsSettings(): MapsSettings {
  const { resolved } = useTheme()
  return {
    config: mapsConfig,
    colorScheme: resolved === 'dark' ? 'DARK' : 'LIGHT',
    language: getLocale(),
  }
}
