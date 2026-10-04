import type { ExpenseCategory, SplitMethod } from '@/api/queries/expenses'
import { m } from '@/paraglide/messages'

export const CATEGORY_LABELS: Record<ExpenseCategory, () => string> = {
  food: m.expense_category_food,
  transport: m.expense_category_transport,
  lodging: m.expense_category_lodging,
  activities: m.expense_category_activities,
  shopping: m.expense_category_shopping,
  other: m.expense_category_other,
}

export const METHOD_LABELS: Record<SplitMethod, () => string> = {
  equal: m.expense_method_equal,
  percent: m.expense_method_percent,
  weights: m.expense_method_weights,
}
