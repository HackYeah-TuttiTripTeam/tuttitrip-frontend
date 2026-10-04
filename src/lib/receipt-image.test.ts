import { describe, expect, it } from 'vitest'
import {
  fitWithin,
  type ImageCodec,
  isReceiptImage,
  prepareReceipt,
  RECEIPT_MAX_BYTES,
  RECEIPT_MAX_SIDE_PX,
  ReceiptImageError,
} from './receipt-image'

const blobOf = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })

/** A codec that records what was asked and answers with sizes from a script. */
function fakeCodec(source: { width: number; height: number }, sizes: number[]) {
  const asked: { width: number; height: number; quality: number }[] = []
  const codec: ImageCodec = {
    decode: async () => source,
    encode: async (size, quality) => {
      asked.push({ ...size, quality })
      return blobOf(sizes[Math.min(asked.length - 1, sizes.length - 1)] ?? 0)
    },
  }
  return { codec, asked }
}

describe('fitWithin', () => {
  it('shrinks the longest side to the limit and keeps the proportions', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 })
  })

  it('never enlarges a small image', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 })
  })
})

describe('prepareReceipt', () => {
  it('re-encodes a phone photo at the limit size in one go', async () => {
    const { codec, asked } = fakeCodec({ width: 4000, height: 3000 }, [900_000])
    const result = await prepareReceipt(blobOf(8_000_000), codec)
    expect(result.size).toBe(900_000)
    expect(asked).toEqual([{ width: RECEIPT_MAX_SIDE_PX, height: 1500, quality: 0.85 }])
  })

  it('lowers the quality and then the size until it fits 5 MB', async () => {
    const big = RECEIPT_MAX_BYTES + 1
    const { codec, asked } = fakeCodec({ width: 4000, height: 3000 }, [big, big, big, big, 1000])
    const result = await prepareReceipt(blobOf(8_000_000), codec)
    expect(result.size).toBe(1000)
    expect(asked.map((a) => a.quality)).toEqual([0.85, 0.7, 0.55, 0.55, 0.55])
    // After the lowest quality the picture itself gets smaller.
    expect(asked[4]?.width).toBeLessThan(asked[2]?.width ?? 0)
  })

  it('gives up with "too large" when nothing makes it fit', async () => {
    const { codec } = fakeCodec({ width: 4000, height: 3000 }, [RECEIPT_MAX_BYTES + 1])
    await expect(prepareReceipt(blobOf(8_000_000), codec)).rejects.toMatchObject({
      reason: 'too_large',
    })
  })

  it('says "unreadable" when the browser cannot decode the file', async () => {
    const codec: ImageCodec = {
      decode: async () => {
        throw new Error('bad image')
      },
      encode: async () => null,
    }
    const failure = await prepareReceipt(blobOf(10), codec).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(ReceiptImageError)
    expect(failure).toMatchObject({ reason: 'unreadable' })
  })
})

describe('isReceiptImage', () => {
  it('lets only images through', () => {
    expect(isReceiptImage({ type: 'image/heic' })).toBe(true)
    expect(isReceiptImage({ type: 'application/pdf' })).toBe(false)
  })
})
