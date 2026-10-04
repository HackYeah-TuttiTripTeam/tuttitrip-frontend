/**
 * Exact money arithmetic on decimal strings. The API sends and takes amounts as strings
 * ("12.50"); nothing here goes through a float, so a sum or a split never drifts by a cent.
 */

const DECIMAL = /^-?\d+(\.\d+)?$/

/**
 * Typed input -> canonical decimal string. Accepts a comma or a point, spaces and non-breaking
 * spaces as thousands separators. Null when it is not a number or has more than `maxFraction` decimal places or `maxWhole` integer digits.
 */
export function parseDecimalInput(
  input: string,
  maxFraction = 2,
  maxWhole = Infinity,
): string | null {
  const text = input.replace(/[\s ]/g, '').replace(',', '.')
  if (!DECIMAL.test(text)) return null
  const [whole = '0', fraction = ''] = text.split('.')
  if (fraction.length > maxFraction) return null
  const negative = whole.startsWith('-')
  const digits = whole.replace('-', '').replace(/^0+(?=\d)/, '')
  if (digits.length > maxWhole) return null
  return `${negative ? '-' : ''}${digits}${fraction ? `.${fraction}` : ''}`
}

/** "12.5" -> 1250n. The string must have at most two decimal places. */
export function toCents(decimal: string): bigint {
  const negative = decimal.startsWith('-')
  const [whole = '0', fraction = ''] = decimal.replace('-', '').split('.')
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
  return negative ? -cents : cents
}

/** 1250n -> "12.50". */
export function centsToDecimal(cents: bigint): string {
  const negative = cents < 0n
  const abs = negative ? -cents : cents
  return `${negative ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`
}

/** A decimal as an integer over 10^scale, to compare and add without floats. */
function scaled(decimal: string, scale: number): bigint {
  const [whole = '0', fraction = ''] = decimal.split('.')
  return BigInt(whole + fraction.padEnd(scale, '0'))
}

const fractionDigits = (decimal: string) => decimal.split('.')[1]?.length ?? 0

/** Exact sum of decimal strings, as a decimal string. */
export function sumDecimals(values: string[]): string {
  const scale = Math.max(0, ...values.map(fractionDigits))
  const total = values.reduce((sum, value) => sum + scaled(value, scale), 0n)
  const digits = String(total < 0n ? -total : total).padStart(scale + 1, '0')
  const text = scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`
  return `${total < 0n ? '-' : ''}${text}`
}

/** -1, 0 or 1 for two decimal strings. */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 {
  const scale = Math.max(fractionDigits(a), fractionDigits(b))
  const [x, y] = [scaled(a, scale), scaled(b, scale)]
  return x === y ? 0 : x < y ? -1 : 1
}

export interface ShareValue {
  profileId: string
  /** Entered percent or weight; ignored (null) for an equal split. */
  value: string | null
}

/**
 * Divides a cost among participants, to the cent, like the backend (`expenses/logic/split.py`):
 * each part is rounded down, the leftover cents go one by one to the largest remainders, and a tie
 * goes to the lower profile id. Values must be positive decimals; the parts add up to the total.
 */
export function allocate(
  totalCents: bigint,
  method: 'equal' | 'percent' | 'weights',
  shares: ShareValue[],
): Map<string, bigint> {
  const scale = Math.max(0, ...shares.map((share) => fractionDigits(share.value ?? '')))
  const weights = shares.map((share) =>
    method === 'equal' || share.value === null ? 1n : scaled(share.value, scale),
  )
  const denominator = weights.reduce((sum, weight) => sum + weight, 0n)
  const rows = shares.map((share, index) => {
    const numerator = totalCents * (weights[index] ?? 0n)
    return { id: share.profileId, floor: numerator / denominator, rest: numerator % denominator }
  })
  let left = totalCents - rows.reduce((sum, row) => sum + row.floor, 0n)
  // UUIDs are compared as lowercase hex, which orders like the integer the backend compares.
  const byRest = rows.toSorted((a, b) =>
    a.rest === b.rest ? (a.id < b.id ? -1 : 1) : a.rest > b.rest ? -1 : 1,
  )
  const extra = new Set<string>()
  for (const row of byRest) {
    if (left <= 0n) break
    extra.add(row.id)
    left -= 1n
  }
  return new Map(rows.map((row) => [row.id, row.floor + (extra.has(row.id) ? 1n : 0n)]))
}
