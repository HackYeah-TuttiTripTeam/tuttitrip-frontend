import { APIProvider } from '@vis.gl/react-google-maps'
import type { ReactNode } from 'react'

interface MapsProviderProps {
  apiKey: string
  /** Language of the labels on the map and of the place card. */
  language: string
  children: ReactNode
}

/**
 * Loads the Maps JavaScript API once for everything below it (the library keeps one script per
 * page, so several providers with the same key share it). Mount it only where a map or a place
 * card is about to show: loading the script is what Google counts and bills. The language is
 * read when the script loads (it cannot change afterwards); the app reloads on a language switch,
 * so the next load uses the new one. The API version is the library's default, `weekly`, which
 * the Places UI Kit elements need.
 */
export function MapsProvider({ apiKey, language, children }: MapsProviderProps) {
  return (
    <APIProvider apiKey={apiKey} language={language}>
      {children}
    </APIProvider>
  )
}
