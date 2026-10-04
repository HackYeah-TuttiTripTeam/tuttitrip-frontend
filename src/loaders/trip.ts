import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import { tripQueryOptions } from '@/api/queries/trips'
import type { VoteSummarySort } from '@/api/queries/vote-links'
import { VOICE_START_FLAG } from '@/lib/constants'
import { TRIP_TABS, type TripTab } from '@/lib/trip-tabs'
import { VOTE_SOURCES, VOTE_SUMMARY_SORTS } from '@/lib/vote-constants'
import {
  type ExpenseSection,
  expenseSectionSchema,
  expensesListDefaults,
  expensesListShape,
} from './expenses'
import type { RouterContext } from './router-context'

/** Sort keys of the lists the trip page shows (the API's `sort` values). */
export const CHECKIN_SORT_KEYS = ['accommodation', 'room', 'updated_at'] as const
export const PHOTO_SORT_KEYS = ['created_at', 'size_bytes'] as const
export const PHOTO_OWNERS = ['all', 'mine', 'others'] as const
export const PLAN_VIEWS = ['list', 'map'] as const
export const SORT_DIRS = ['asc', 'desc'] as const

/** Values left out of the URL (see stripSearchParams in routes/trips_.$tripId.ts). */
export const tripSearchDefaults = {
  ...expensesListDefaults,
  section: 'list',
  tab: 'interview',
  vpage: 1,
  vsort: 'name',
  view: 'list',
  ci_page: 1,
  ci_sort: 'accommodation',
  ci_dir: 'asc',
  ci_q: '',
  ph_page: 1,
  ph_sort: 'created_at',
  ph_dir: 'desc',
  ph_owner: 'all',
} as const satisfies {
  tab: TripTab
  vpage: number
  vsort: VoteSummarySort
  view: (typeof PLAN_VIEWS)[number]
  ci_page: number
  ci_sort: (typeof CHECKIN_SORT_KEYS)[number]
  ci_dir: (typeof SORT_DIRS)[number]
  ci_q: string
  ph_page: number
  ph_sort: (typeof PHOTO_SORT_KEYS)[number]
  ph_dir: (typeof SORT_DIRS)[number]
  ph_owner: (typeof PHOTO_OWNERS)[number]
  section: ExpenseSection
}

const CHECKIN_FILTER_MAX_CHARS = 200

/**
 * /trips/$tripId?tab=&person=&vpage=&vsort=&vsource=&vveto=&view=&ci_*=&ph_*= — a bad value falls
 * back to the default instead of erroring. `view` is the Plan tab's List | Map switch; `ci_*`
 * (page, sort, dir, q) is the check-in list of the Osoby tab; `ph_*` (page, sort, dir, owner) is
 * the Zdjęcia gallery.
 */
export const tripSearchSchema = z.object({
  tab: z.enum(TRIP_TABS).default(tripSearchDefaults.tab).catch(tripSearchDefaults.tab),
  /** The open person of the Osoby tab (a profile id); a bad value shows the list. */
  person: z.uuid().optional().catch(undefined),
  /** The vote summary of the Osoby tab: page, sort, source filter and "only with a veto". */
  vpage: z.number().int().min(1).default(tripSearchDefaults.vpage).catch(tripSearchDefaults.vpage),
  vsort: z
    .enum(VOTE_SUMMARY_SORTS)
    .default(tripSearchDefaults.vsort)
    .catch(tripSearchDefaults.vsort),
  /** `voice=1`: the trip was just created by voice, the Wywiad tab starts the call (then drops the param). */
  voice: z.literal(VOICE_START_FLAG).optional().catch(undefined),
  vsource: z.enum(VOTE_SOURCES).optional().catch(undefined),
  vveto: z.literal(true).optional().catch(undefined),
  view: z.enum(PLAN_VIEWS).default(tripSearchDefaults.view).catch(tripSearchDefaults.view),
  ci_page: z.coerce
    .number()
    .int()
    .min(1)
    .default(tripSearchDefaults.ci_page)
    .catch(tripSearchDefaults.ci_page),
  ci_sort: z
    .enum(CHECKIN_SORT_KEYS)
    .default(tripSearchDefaults.ci_sort)
    .catch(tripSearchDefaults.ci_sort),
  ci_dir: z.enum(SORT_DIRS).default(tripSearchDefaults.ci_dir).catch(tripSearchDefaults.ci_dir),
  // TanStack Router parses ?ci_q=2026 as a number, so accept both.
  ci_q: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).slice(0, CHECKIN_FILTER_MAX_CHARS))
    .default(tripSearchDefaults.ci_q)
    .catch(tripSearchDefaults.ci_q),
  ph_page: z.coerce
    .number()
    .int()
    .min(1)
    .default(tripSearchDefaults.ph_page)
    .catch(tripSearchDefaults.ph_page),
  ph_sort: z
    .enum(PHOTO_SORT_KEYS)
    .default(tripSearchDefaults.ph_sort)
    .catch(tripSearchDefaults.ph_sort),
  ph_dir: z.enum(SORT_DIRS).default(tripSearchDefaults.ph_dir).catch(tripSearchDefaults.ph_dir),
  ph_owner: z
    .enum(PHOTO_OWNERS)
    .default(tripSearchDefaults.ph_owner)
    .catch(tripSearchDefaults.ph_owner),
  /** The Wydatki tab: the part (list or settlement) and the list state, see loaders/expenses.ts. */
  section: expenseSectionSchema,
  ...expensesListShape,
})

export type TripSearch = z.output<typeof tripSearchSchema>

/** Starts fetching the trip before the view renders, when we already hold a token. */
export function loadTrip({
  context,
  params,
}: {
  context: RouterContext
  params: { tripId: string }
}) {
  if (!canCallProtectedApi()) return
  // A failed prefetch (404, offline) is shown by the view, not thrown by the loader.
  return context.queryClient.prefetchQuery(tripQueryOptions(params.tripId))
}
