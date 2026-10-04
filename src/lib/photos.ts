// The photos of the public pages as URLs for the app. Data and credits: photo-data.ts.
import { PHOTOS, type PhotoFormat, type PhotoId } from './photo-data'

export * from './photo-data'

// Vite turns each file into a URL (and copies it to dist, see assetFileNames in vite.config.ts).
const urls = import.meta.glob<string>('/src/assets/photos/*.{avif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function url(file: string, width: number, format: PhotoFormat): string {
  const found = urls[`/src/assets/photos/${file}-${width}.${format}`]
  if (!found) throw new Error(`Missing photo file ${file}-${width}.${format}`)
  return found
}

/** `srcset` of one format, e.g. "/assets/a-480.avif 480w, /assets/a-960.avif 960w". */
export function photoSrcSet(id: PhotoId, format: PhotoFormat): string {
  const { file, widths } = PHOTOS[id]
  return widths.map((width) => `${url(file, width, format)} ${width}w`).join(', ')
}

/** The middle WebP width, for browsers that ignore `<picture>` sources. */
export function photoFallback(id: PhotoId): string {
  const { file, widths } = PHOTOS[id]
  return url(file, widths[Math.floor(widths.length / 2)] ?? widths[0] ?? 0, 'webp')
}
