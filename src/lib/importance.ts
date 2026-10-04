import type { ImportancePool } from '@/api/queries/preferences'

export type PoolDomain = keyof ImportancePool

/** The five domains in the order shown (docs/algorytm.md, section 1). */
export const POOL_DOMAINS: readonly PoolDomain[] = [
  'lodging',
  'food',
  'attractions',
  'pace',
  'cost',
]

/**
 * Points of a pool. The API validates the sum but does not publish it, so it lives here once;
 * it is the "10" of `a_ij` in the algorithm spec.
 */
export const POOL_TOTAL = 10

/** The threshold theta = 0.4 of E5, in points (4 of 10): from here a domain forces places. */
export const MIN_THRESHOLD_POINTS = 4

export const poolSum = (pool: ImportancePool) =>
  POOL_DOMAINS.reduce((sum, domain) => sum + pool[domain], 0)

export const poolRemaining = (pool: ImportancePool) => POOL_TOTAL - poolSum(pool)

/**
 * Places the automatic minimum forces for a domain with `points`, or 0 below the threshold:
 * k = 1 + floor((a - theta) / (1 - theta) * 2) with a = points / total. Integer maths, because
 * (0.7 - 0.4) / 0.6 * 2 comes out as 0.99999 in floating point (7 points must give 2).
 */
export function forcedPlaces(points: number): number {
  if (points < MIN_THRESHOLD_POINTS) return 0
  return 1 + Math.floor((2 * (points - MIN_THRESHOLD_POINTS)) / (POOL_TOTAL - MIN_THRESHOLD_POINTS))
}

/**
 * Moves one domain by `step` points. Never leaves 0..10 and never takes more than the points
 * still free, so the sum cannot go over the total.
 */
export function stepPool(pool: ImportancePool, domain: PoolDomain, step: number): ImportancePool {
  const next = Math.min(
    pool[domain] + Math.max(0, poolRemaining(pool)),
    Math.max(0, pool[domain] + step),
  )
  return { ...pool, [domain]: Math.min(POOL_TOTAL, next) }
}

export const samePool = (a: ImportancePool, b: ImportancePool) =>
  POOL_DOMAINS.every((domain) => a[domain] === b[domain])
