import { $api, type Schemas } from '@/api/client'
import { pagedQueryOptions } from './paged'

export type Expense = Schemas['ExpenseRead']
export type ExpenseCreate = Schemas['ExpenseCreate']
export type ExpenseUpdate = Schemas['ExpenseUpdate']
export type ExpenseCategory = Schemas['ExpenseCategory']
export type ExpenseSort = Schemas['ExpenseSort']
export type SplitMethod = Schemas['SplitMethod']
export type ExpenseErrorCode = Schemas['ExpenseErrorCode']

/** What the list view sends: the validated URL search (see loaders/expenses.ts). */
export interface ExpensesSearch {
  page: number
  size: number
  sort: ExpenseSort
  dir: Schemas['SortDir']
  payer?: string | undefined
  participant?: string | undefined
  category?: ExpenseCategory | undefined
  from?: string | undefined
  to?: string | undefined
}

/** The URL names (payer, from...) become the API's; the rest goes as it is. */
export function expensesApiQuery({ payer, participant, from, to, ...rest }: ExpensesSearch) {
  return {
    ...rest,
    payer_profile_id: payer,
    participant_profile_id: participant,
    date_from: from,
    date_to: to,
  }
}

/** Prefix of every cached page of a trip's expenses, for invalidation after a write. */
export const expensesListKey = ['get', '/api/v1/trips/{trip_id}/expenses'] as const

export const expensesQueryOptions = (tripId: string, search: ExpensesSearch) =>
  pagedQueryOptions(
    $api.queryOptions('get', '/api/v1/trips/{trip_id}/expenses', {
      params: { path: { trip_id: tripId }, query: expensesApiQuery(search) },
    }),
  )
