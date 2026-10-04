import { z } from 'zod'
import { EXPENSE_CATEGORIES, EXPENSE_SORT_KEYS } from '@/lib/expense-form'
import { createListSearchSchema } from './list-search'

/** The two parts of the Wydatki tab. */
export const EXPENSE_SECTIONS = ['list', 'settlement'] as const
export type ExpenseSection = (typeof EXPENSE_SECTIONS)[number]

const optional = <T extends z.ZodType>(type: T) => type.optional().catch(undefined)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/**
 * The expenses list in the URL of the trip page: ?section=&page=&size=&sort=&dir=&payer=
 * &participant=&category=&from=&to=. `to` before `from` is dropped, so the URL, the filter bar and
 * the request agree. The API filters, sorts and pages.
 */
const { schema, defaults } = createListSearchSchema({
  sortKeys: EXPENSE_SORT_KEYS,
  defaultSort: 'spent_on',
  defaultDir: 'desc',
  filters: {
    payer: optional(z.uuid()),
    participant: optional(z.uuid()),
    category: optional(z.enum(EXPENSE_CATEGORIES)),
    from: optional(day),
    to: optional(day),
  },
})

export const expensesListShape = schema.shape
export const expensesListDefaults = defaults

export const expenseSectionSchema = z.enum(EXPENSE_SECTIONS).default('list').catch('list')

/** The filters of the list without sort and paging. */
export const expenseFilterDefaults = {
  payer: undefined,
  participant: undefined,
  category: undefined,
  from: undefined,
  to: undefined,
}

/** Every param of the Wydatki tab set to "absent", for a tab switch: the next tab's URL stays clean. */
export const expenseSearchReset = {
  section: undefined,
  page: undefined,
  size: undefined,
  sort: undefined,
  dir: undefined,
  ...expenseFilterDefaults,
}
