// The photos of the public pages: files, sizes and credits (plain data, also used by the Worker). The files live in
// src/assets/photos with their CREDITS.md; every Unsplash photo is credited next to where it shows.

export type PhotoId = 'warszawa' | 'gdansk' | 'krakow' | 'berlin' | 'rodzina' | 'zespol'

export interface PhotoCredit {
  author: string
  authorUrl: string
  photoUrl: string
}

export interface Photo {
  /** File name without width and extension. */
  file: string
  widths: number[]
  /** Size of the largest file; the aspect ratio is the same for every width. */
  width: number
  height: number
  /** Unsplash credit; the team's own photo has none. */
  credit?: PhotoCredit
}

const unsplash = (author: string, handle: string, id: string): PhotoCredit => ({
  author,
  authorUrl: `https://unsplash.com/@${handle}`,
  photoUrl: `https://unsplash.com/photos/${id}`,
})

export const UNSPLASH_URL = 'https://unsplash.com'
export const UNSPLASH_LICENSE_URL = 'https://unsplash.com/license'

export const PHOTOS: Record<PhotoId, Photo> = {
  warszawa: {
    file: 'warszawa-zamek',
    widths: [480, 960, 1600],
    width: 1600,
    height: 1067,
    credit: unsplash('Lāsma Artmane', 'lasmaa', 'p6gxHYb43v0'),
  },
  gdansk: {
    file: 'gdansk-dlugi-targ',
    widths: [480, 960, 1600],
    width: 1600,
    height: 1067,
    credit: unsplash('Darya Tryfanava', 'darya_tryfanava', 'OoCU63dSKjU'),
  },
  krakow: {
    file: 'krakow-rynek',
    widths: [480, 960, 1600],
    width: 1600,
    height: 1067,
    credit: unsplash('Aimable Mugabo', 'mugabo_library', 'iLr6iT9buiQ'),
  },
  berlin: {
    file: 'berlin-brama-brandenburska',
    widths: [480, 960, 1600],
    width: 1600,
    height: 1067,
    credit: unsplash('Claudio Schwarz', 'purzlbaum', 'TScGhJM716g'),
  },
  rodzina: {
    file: 'rodzina-na-sciezce',
    widths: [400, 800, 1200],
    width: 1200,
    height: 1500,
    credit: unsplash('Orlando Allo', 'orlandoallo', 'qRpOzXWsu3c'),
  },
  zespol: { file: 'zespol', widths: [320, 640], width: 640, height: 352 },
}

export type PhotoFormat = 'avif' | 'webp'

/**
 * Where a photo file is served in a build: vite.config.ts keeps their names (no hash) under
 * /assets/photos, so the Worker can write them into the first HTML before any script runs.
 * Rename a file when its picture changes: /assets/* is cached as immutable.
 */
export function photoPath(file: string, width: number, format: PhotoFormat): string {
  return `/assets/photos/${file}-${width}.${format}`
}
