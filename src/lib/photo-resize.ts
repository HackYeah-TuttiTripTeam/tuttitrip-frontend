import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_SIDE_PX,
  THUMBNAIL_MAX_BYTES,
  THUMBNAIL_MAX_SIDE_PX,
} from './trip-extras'

/** Whatever the browser can decode goes in; JPEG (which the API accepts) comes out. */
export const PHOTO_OUTPUT_TYPE = 'image/jpeg'

const FIRST_QUALITY = 0.85
const QUALITY_STEP = 0.1
const MIN_QUALITY = 0.4
const SCALE_STEP = 0.8
const MAX_ATTEMPTS = 8

export interface Size {
  width: number
  height: number
}

/** The size that fits `max` pixels on the longer side, never enlarging. */
export function fitWithin(size: Size, max: number): Size {
  const longest = Math.max(size.width, size.height)
  if (longest <= max) return size
  const ratio = max / longest
  return {
    width: Math.max(1, Math.round(size.width * ratio)),
    height: Math.max(1, Math.round(size.height * ratio)),
  }
}

/** Encodes the picture at a size and quality; the real one draws on a canvas. */
export type Encode = (size: Size, quality: number) => Promise<Blob>

/**
 * Re-encodes until the result fits `maxBytes`: first the quality drops, then (at the lowest
 * quality) the picture shrinks. Throws when even the smallest attempt is too big.
 */
export async function encodeUnder(
  encode: Encode,
  size: Size,
  maxBytes: number,
  attempts = MAX_ATTEMPTS,
): Promise<Blob> {
  let quality = FIRST_QUALITY
  let current = size
  for (let attempt = 0; attempt < attempts; attempt++) {
    const blob = await encode(current, quality)
    if (blob.size <= maxBytes) return blob
    if (quality - QUALITY_STEP >= MIN_QUALITY) {
      quality -= QUALITY_STEP
    } else {
      current = {
        width: Math.max(1, Math.round(current.width * SCALE_STEP)),
        height: Math.max(1, Math.round(current.height * SCALE_STEP)),
      }
    }
  }
  throw new Error('The photo cannot be made small enough')
}

export interface PreparedPhoto {
  image: Blob
  thumbnail: Blob
}

/** Draws the bitmap on a canvas and exports JPEG. A canvas carries no EXIF, GPS or XMP. */
function canvasEncoder(bitmap: ImageBitmap): Encode {
  return (size, quality) =>
    new Promise<Blob>((resolve, reject) => {
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('No canvas'))
        return
      }
      // JPEG has no transparency: a PNG with a see-through background would turn black.
      context.fillStyle = 'white'
      context.fillRect(0, 0, size.width, size.height)
      context.drawImage(bitmap, 0, 0, size.width, size.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))),
        PHOTO_OUTPUT_TYPE,
        quality,
      )
    })
}

/** The browser could not decode the file; `heic` tells the user why (most browsers cannot). */
export class PhotoDecodeError extends Error {
  readonly heic: boolean
  constructor(heic: boolean) {
    super('The photo cannot be decoded')
    this.name = 'PhotoDecodeError'
    this.heic = heic
  }
}

const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)

/**
 * Decodes with the camera's rotation applied. A picture larger than needed is decoded once more
 * at the target size, so the canvas work and the memory held afterwards stay small.
 */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    const full = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const target = fitWithin({ width: full.width, height: full.height }, PHOTO_MAX_SIDE_PX)
    if (target.width === full.width && target.height === full.height) return full
    try {
      return await createImageBitmap(full, {
        resizeWidth: target.width,
        resizeHeight: target.height,
        resizeQuality: 'high',
      })
    } finally {
      full.close()
    }
  } catch {
    throw new PhotoDecodeError(isHeic(file))
  }
}

/**
 * The picture to upload and its thumbnail, both re-encoded through a canvas. That is what strips
 * the metadata (the API refuses EXIF) and the camera's orientation is applied by the decoder.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await decode(file)
  try {
    const source = { width: bitmap.width, height: bitmap.height }
    const encode = canvasEncoder(bitmap)
    const image = await encodeUnder(encode, fitWithin(source, PHOTO_MAX_SIDE_PX), PHOTO_MAX_BYTES)
    const thumbnail = await encodeUnder(
      encode,
      fitWithin(source, THUMBNAIL_MAX_SIDE_PX),
      THUMBNAIL_MAX_BYTES,
    )
    return { image, thumbnail }
  } finally {
    bitmap.close()
  }
}

export const isPhotoFile = (file: File) => file.type.startsWith('image/')
