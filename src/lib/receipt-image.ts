/** The API accepts JPEG, PNG and WebP up to 5 MB (checked on the content). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
/** Longest side after shrinking: a receipt stays readable, a phone photo (12 MP) gets small. */
export const RECEIPT_MAX_SIDE_PX = 2000
export const RECEIPT_JPEG_TYPE = 'image/jpeg'
/** First try; each retry below the size limit lowers it by one step. */
const JPEG_QUALITIES = [0.85, 0.7, 0.55] as const
const SIDE_SHRINK = 0.75
const MAX_ATTEMPTS = 6

/** Which kind of file the picker handed us, before any decoding. */
export function isReceiptImage(file: Pick<File, 'type'>): boolean {
  return file.type.startsWith('image/')
}

/** The size that fits `width` x `height` into `maxSide` on the longest side, never enlarging. */
export function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** What the browser has to offer; injected so the loop is testable without a canvas. */
export interface ImageCodec {
  /** Decoded and already rotated by its EXIF orientation. */
  decode: (file: Blob) => Promise<{ width: number; height: number }>
  /** Draws the decoded image at the size and encodes it as JPEG at the quality. */
  encode: (size: { width: number; height: number }, quality: number) => Promise<Blob | null>
}

export class ReceiptImageError extends Error {
  readonly reason: 'unreadable' | 'too_large'

  constructor(reason: 'unreadable' | 'too_large') {
    super(`Receipt image: ${reason}`)
    this.name = 'ReceiptImageError'
    this.reason = reason
  }
}

/**
 * Draws the photo on a canvas and encodes it again as JPEG. A canvas carries pixels only, so the
 * EXIF block (GPS location, camera, time) never reaches the server; the orientation is applied
 * first, so the receipt stays upright. Shrinks until the result fits `RECEIPT_MAX_BYTES`.
 */
export async function prepareReceipt(file: Blob, codec: ImageCodec): Promise<Blob> {
  let source: { width: number; height: number }
  try {
    source = await codec.decode(file)
  } catch {
    throw new ReceiptImageError('unreadable')
  }
  let size = fitWithin(source.width, source.height, RECEIPT_MAX_SIDE_PX)
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const quality = JPEG_QUALITIES[Math.min(attempt, JPEG_QUALITIES.length - 1)] ?? 0.55
    const blob = await codec.encode(size, quality)
    if (!blob) throw new ReceiptImageError('unreadable')
    if (blob.size <= RECEIPT_MAX_BYTES) return blob
    if (attempt >= JPEG_QUALITIES.length - 1) {
      size = fitWithin(
        size.width,
        size.height,
        Math.round(Math.max(size.width, size.height) * SIDE_SHRINK),
      )
    }
  }
  throw new ReceiptImageError('too_large')
}

/** The browser's own decoder and canvas. `imageOrientation: 'from-image'` applies the EXIF rotation. */
export function browserCodec(): ImageCodec {
  let bitmap: ImageBitmap | null = null
  return {
    async decode(file) {
      bitmap?.close()
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { width: bitmap.width, height: bitmap.height }
    },
    async encode(size, quality) {
      if (!bitmap) return null
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      const context = canvas.getContext('2d')
      if (!context) return null
      // A PNG screenshot with transparency would turn black in JPEG.
      context.fillStyle = 'white'
      context.fillRect(0, 0, size.width, size.height)
      context.drawImage(bitmap, 0, 0, size.width, size.height)
      return new Promise((resolve) => canvas.toBlob(resolve, RECEIPT_JPEG_TYPE, quality))
    },
  }
}
