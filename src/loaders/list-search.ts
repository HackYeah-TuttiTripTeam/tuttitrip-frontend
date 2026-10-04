import { z } from 'zod'

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@/lib/pagination'
export type SortDirection = 'asc' | 'desc'

interface ListSearchConfig<K extends readonly [string, ...string[]], F extends z.ZodRawShape> {
  sortKeys: K
  defaultSort: K[number]
  defaultDir?: SortDirection
  /** Each filter carries its own .default() / .catch(), like the list-wide params below. */
  filters: F
}

/**
 * The URL contract of every list view: ?page=&size=&sort=&dir= plus the view's filters.
 * Bad values fall back to defaults instead of erroring. `defaults` feeds stripSearchParams,
 * so a default is never written to the URL.
 */
export function createListSearchSchema<
  const K extends readonly [string, ...string[]],
  F extends z.ZodRawShape,
>({ sortKeys, defaultSort, defaultDir = 'desc', filters }: ListSearchConfig<K, F>) {
  const schema = z.object({
    page: z.number().int().min(1).default(1).catch(1),
    size: z.literal(PAGE_SIZES).default(DEFAULT_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
    sort: z.enum(sortKeys).default(defaultSort).catch(defaultSort),
    dir: z.enum(['asc', 'desc']).default(defaultDir).catch(defaultDir),
    ...filters,
  })
  return { schema, defaults: schema.parse({}) }
}

/** A text filter: TanStack Router parses ?q=2026 as a number, so accept both. */
export const textFilter = (max = 100) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => String(value).slice(0, max))
    .default('')
    .catch('')
