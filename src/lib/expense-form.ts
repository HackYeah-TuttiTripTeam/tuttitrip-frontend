import { z } from 'zod'
import { ApiError } from '@/api/errors'
import type {
  Expense,
  ExpenseCategory,
  ExpenseCreate,
  ExpenseErrorCode,
  SplitMethod,
} from '@/api/queries/expenses'
import { m } from '@/paraglide/messages'
import { allocate, compareDecimals, parseDecimalInput, sumDecimals, toCents } from './money'

export const EXPENSE_SORT_KEYS = ['spent_on', 'amount', 'created_at'] as const

export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'lodging',
  'activities',
  'shopping',
  'other',
] as const satisfies readonly ExpenseCategory[]

export const SPLIT_METHODS = [
  'equal',
  'percent',
  'weights',
] as const satisfies readonly SplitMethod[]
export const NO_CATEGORY = ''

/** For a trip with no currency of its own, the user picks one of these. */
export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CZK', 'CHF'] as const
const DEFAULT_CURRENCY = 'PLN'

/** The API's limits (ExpenseCreate / ShareInput patterns): 10 digits + 2 decimals, 6 digits + 4. */
export const AMOUNT_LIMITS = { whole: 10, fraction: 2 } as const
export const SHARE_LIMITS = { whole: 6, fraction: 4 } as const

/** The form's own values: strings as typed, one row per person of the trip. */
export interface ExpenseFormValues {
  amount: string
  spentOn: string
  payerId: string
  description: string
  category: ExpenseCategory | typeof NO_CATEGORY
  /** The currency to send. Empty when the trip has its own: the API then takes the trip's. */
  currency: string
  method: SplitMethod
  /** Profile ids that share the cost. */
  included: string[]
  /** Entered percent or weight per profile id. */
  values: Record<string, string>
}

export type ExpenseFormField =
  | 'amount'
  | 'spentOn'
  | 'payerId'
  | 'participants'
  | 'currency'
  | 'rate'

export const todayIso = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${String(now.getDate()).padStart(2, '0')}`
}

/** A new expense: today, everybody takes part, split equally. The payer is the caller when known. */
export function emptyExpenseForm(
  peopleIds: string[],
  payerId: string,
  tripHasCurrency: boolean,
): ExpenseFormValues {
  return {
    currency: tripHasCurrency ? '' : DEFAULT_CURRENCY,
    amount: '',
    spentOn: todayIso(),
    payerId,
    description: '',
    category: NO_CATEGORY,
    method: 'equal',
    included: peopleIds,
    values: {},
  }
}

export function expenseToFormValues(expense: Expense, tripHasCurrency: boolean): ExpenseFormValues {
  return {
    currency: tripHasCurrency ? '' : expense.currency,
    amount: expense.amount,
    spentOn: expense.spent_on,
    payerId: expense.payer_profile_id,
    description: expense.description,
    category: expense.category ?? NO_CATEGORY,
    method: expense.split_method,
    included: expense.participants.map((p) => p.profile_id),
    values: Object.fromEntries(
      expense.participants.flatMap((p) => (p.value === null ? [] : [[p.profile_id, p.value]])),
    ),
  }
}

/** The entered value of one person, canonical, or null when it is empty or not a number. */
const enteredValue = (values: ExpenseFormValues, id: string) =>
  parseDecimalInput(values.values[id] ?? '', SHARE_LIMITS.fraction, SHARE_LIMITS.whole)

/** What is wrong with the split itself; the form shows it live and keeps "Save" off meanwhile. */
export type SplitIssue =
  | { kind: 'nobody' }
  | { kind: 'value_missing' }
  | { kind: 'percent_sum'; total: string; missing: string }

export function splitIssue(values: ExpenseFormValues): SplitIssue | null {
  if (values.included.length === 0) return { kind: 'nobody' }
  if (values.method === 'equal') return null
  const entered = values.included.map((id) => enteredValue(values, id))
  if (entered.some((value) => value === null || compareDecimals(value, '0') <= 0)) {
    return { kind: 'value_missing' }
  }
  if (values.method === 'percent') {
    const total = sumDecimals(entered.filter((value): value is string => value !== null))
    if (compareDecimals(total, '100') !== 0) {
      return { kind: 'percent_sum', total, missing: sumDecimals(['100', `-${total}`]) }
    }
  }
  return null
}

/**
 * Each person's part in cents, with the backend's own allocation, so the preview and the saved
 * expense agree to the cent. Empty while the amount or the split is not valid yet.
 */
export function previewShares(values: ExpenseFormValues): Map<string, bigint> {
  const amount = parseDecimalInput(values.amount, AMOUNT_LIMITS.fraction, AMOUNT_LIMITS.whole)
  if (amount === null || compareDecimals(amount, '0') <= 0 || splitIssue(values) !== null) {
    return new Map()
  }
  return allocate(
    toCents(amount),
    values.method,
    values.included.map((profileId) => ({
      profileId,
      value: values.method === 'equal' ? null : enteredValue(values, profileId),
    })),
  )
}

/** Field rules; the split rules are `splitIssue`, which also drives the disabled button. */
export const expenseFormSchema = z.object({
  amount: z.string().refine(
    (value) => {
      const parsed = parseDecimalInput(value, AMOUNT_LIMITS.fraction, AMOUNT_LIMITS.whole)
      return parsed !== null && compareDecimals(parsed, '0') > 0
    },
    { error: () => m.expense_error_amount() },
  ),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: () => m.expense_error_date() }),
  payerId: z.string().min(1, { error: () => m.expense_error_payer() }),
  description: z.string().max(200, { error: () => m.expense_error_description() }),
  category: z.enum([...EXPENSE_CATEGORIES, '']),
  currency: z.string(),
  method: z.enum(SPLIT_METHODS),
  included: z.array(z.string()),
  values: z.record(z.string(), z.string()),
})

function shares(values: ExpenseFormValues): ExpenseCreate['participants'] {
  return values.included.map((profile_id) => ({
    profile_id,
    ...(values.method === 'equal' ? {} : { value: enteredValue(values, profile_id) }),
  }))
}

/** The body of POST and PATCH: PATCH takes the same fields, and `participants` replaces the list. */
export function formValuesToBody(values: ExpenseFormValues): ExpenseCreate {
  return {
    ...(values.currency ? { currency: values.currency } : {}),
    payer_profile_id: values.payerId,
    amount:
      parseDecimalInput(values.amount, AMOUNT_LIMITS.fraction, AMOUNT_LIMITS.whole) ??
      values.amount,
    description: values.description.trim(),
    spent_on: values.spentOn,
    category: values.category === NO_CATEGORY ? null : values.category,
    split_method: values.method,
    participants: shares(values),
  }
}

const CODE_FIELD: Record<ExpenseErrorCode, ExpenseFormField> = {
  'expense.null_not_allowed': 'amount',
  'expense.amount_not_positive': 'amount',
  'expense.currency_required': 'currency',
  'expense.currency_unsupported': 'currency',
  'expense.rate_not_found': 'rate',
  'expense.rate_unavailable': 'rate',
  'expense.payer_not_on_trip': 'payerId',
  'expense.participants_required': 'participants',
  'expense.participant_not_on_trip': 'participants',
  'expense.participant_duplicated': 'participants',
  'expense.share_value_required': 'participants',
  'expense.share_value_not_allowed': 'participants',
  'expense.percent_sum': 'participants',
  'expense.share_value_not_positive': 'participants',
}

const CODE_MESSAGE: Record<ExpenseErrorCode, () => string> = {
  'expense.null_not_allowed': () => m.expense_error_amount(),
  'expense.amount_not_positive': () => m.expense_error_amount(),
  'expense.currency_required': () => m.expense_error_currency_required(),
  'expense.currency_unsupported': () => m.expense_error_currency_unsupported(),
  'expense.rate_not_found': () => m.expense_error_rate_not_found(),
  'expense.rate_unavailable': () => m.expense_error_rate_unavailable(),
  'expense.payer_not_on_trip': () => m.expense_error_payer_not_on_trip(),
  'expense.participants_required': () => m.expense_error_nobody(),
  'expense.participant_not_on_trip': () => m.expense_error_participant_not_on_trip(),
  'expense.participant_duplicated': () => m.expense_error_participant_duplicated(),
  'expense.share_value_required': () => m.expense_error_value_missing(),
  'expense.share_value_not_allowed': () => m.expense_error_value_not_allowed(),
  'expense.percent_sum': () => m.expense_error_percent_sum(),
  'expense.share_value_not_positive': () => m.expense_error_value_positive(),
}

const isCode = (value: unknown): value is ExpenseErrorCode =>
  typeof value === 'string' && value in CODE_FIELD

/** The 422 body carries `expense.*` codes in `type`; map them onto fields, never parse `msg`. */
export function mapExpenseErrors(detail: unknown): Partial<Record<ExpenseFormField, string>> {
  const errors: Partial<Record<ExpenseFormField, string>> = {}
  if (!Array.isArray(detail)) return errors
  for (const item of detail) {
    const type: unknown = typeof item === 'object' && item !== null ? item.type : undefined
    if (isCode(type)) errors[CODE_FIELD[type]] ??= CODE_MESSAGE[type]()
  }
  return errors
}

/** The message for a failed write that is no field error: 403 (not yours), 409 (settlement closed). */
export function expenseWriteFailure(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) return m.expense_error_forbidden()
  if (error instanceof ApiError && error.status === 409) return m.expense_error_closed()
  return fallback
}
