import { PHOTOS, type PhotoId, photoFallback, photoSrcSet } from '@/lib/photos'
import { cn } from '@/lib/utils'

interface PictureProps {
  id: PhotoId
  alt: string
  /** The `sizes` attribute: how wide the image is shown at each viewport width. */
  sizes: string
  /** The first image of the page: loaded at once and with high priority. Every other one is lazy. */
  priority?: boolean
  className?: string
}

/**
 * A photo as AVIF, then WebP, in the widths of src/assets/photos. Width and height are the real
 * size of the file, so the browser reserves the space and nothing shifts while it loads.
 */
export function Picture({ id, alt, sizes, priority = false, className }: PictureProps) {
  const { width, height } = PHOTOS[id]
  return (
    <picture>
      <source type="image/avif" srcSet={photoSrcSet(id, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={photoSrcSet(id, 'webp')} sizes={sizes} />
      <img
        src={photoFallback(id)}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={cn('block h-auto w-full', className)}
      />
    </picture>
  )
}
