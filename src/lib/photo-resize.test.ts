import { describe, expect, it } from 'vitest'
import {
  type Encode,
  encodeUnder,
  fitWithin,
  isPhotoFile,
  PhotoDecodeError,
  preparePhoto,
} from './photo-resize'

describe('fitWithin', () => {
  it('shrinks the longer side to the limit and keeps the ratio', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin({ width: 3000, height: 4000 }, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('never enlarges a small picture', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('keeps at least one pixel on a very thin picture', () => {
    expect(fitWithin({ width: 10_000, height: 1 }, 100)).toEqual({ width: 100, height: 1 })
  })
})

/** A fake encoder: the size in bytes is the pixel count scaled by the quality. */
const fakeEncode =
  (calls: Array<{ width: number; quality: number }>): Encode =>
  async (size, quality) => {
    calls.push({ width: size.width, quality })
    return new Blob([new Uint8Array(Math.round(size.width * size.height * quality))])
  }

describe('encodeUnder', () => {
  it('returns the first attempt when it already fits', async () => {
    const calls: Array<{ width: number; quality: number }> = []
    const blob = await encodeUnder(fakeEncode(calls), { width: 100, height: 100 }, 1_000_000)
    expect(blob.size).toBeLessThanOrEqual(1_000_000)
    expect(calls).toHaveLength(1)
  })

  it('lowers the quality first and then shrinks the picture', async () => {
    const calls: Array<{ width: number; quality: number }> = []
    const blob = await encodeUnder(fakeEncode(calls), { width: 1000, height: 1000 }, 100_000, 30)
    expect(blob.size).toBeLessThanOrEqual(100_000)
    expect(calls[0]?.quality).toBeGreaterThan(calls[1]?.quality ?? 1)
    // The width stays while the quality drops, then it falls.
    expect(calls[0]?.width).toBe(calls[1]?.width)
    expect(calls.at(-1)?.width).toBeLessThan(1000)
  })

  it('gives up with an error when nothing fits', async () => {
    await expect(encodeUnder(fakeEncode([]), { width: 1000, height: 1000 }, 1, 3)).rejects.toThrow()
  })
})

describe('isPhotoFile', () => {
  it('takes images and nothing else', () => {
    expect(isPhotoFile(new File([''], 'a.heic', { type: 'image/heic' }))).toBe(true)
    expect(isPhotoFile(new File([''], 'a.pdf', { type: 'application/pdf' }))).toBe(false)
  })
})

describe('preparePhoto', () => {
  it('says so when a HEIC file cannot be decoded (no createImageBitmap here)', async () => {
    const error = await preparePhoto(new File(['x'], 'IMG_1.HEIC', { type: 'image/heic' })).catch(
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(PhotoDecodeError)
    expect((error as PhotoDecodeError).heic).toBe(true)
  })

  it('does not blame HEIC for another broken file', async () => {
    const error = await preparePhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' })).catch(
      (caught: unknown) => caught,
    )
    expect((error as PhotoDecodeError).heic).toBe(false)
  })
})
