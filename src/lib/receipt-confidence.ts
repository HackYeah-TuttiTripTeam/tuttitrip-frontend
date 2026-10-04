import type { Expense } from '@/api/queries/expenses'

/** The fields of the confirmation card the reader can be unsure about. */
export type ReceiptField = 'amount' | 'spentOn' | 'category' | 'currency' | 'description'

/** Words the reader's `reasons` use for each field (they are free text, in English or Polish). */
const FIELD_WORDS: Record<ReceiptField, RegExp> = {
  amount: /amount|total|sum|kwot|suma/i,
  spentOn: /date|day|data|dzie/i,
  category: /categor|kategor/i,
  currency: /currenc|walut/i,
  description: /merchant|shop|store|description|opis|sklep/i,
}

/**
 * Fields to mark on the card. Missing values (no category, no date) are always marked. When the
 * reader says it was unsure, the fields its reasons name are marked; when the reasons name none,
 * the money and the date are, because those decide the settlement.
 */
export function uncertainFields(
  draft: Pick<Expense, 'category' | 'description'>,
  needsConfirmation: boolean | null,
  reasons: string[],
): Set<ReceiptField> {
  const marked = new Set<ReceiptField>()
  if (draft.category === null) marked.add('category')
  if (!needsConfirmation) return marked
  const text = reasons.join(' ')
  for (const [field, words] of Object.entries(FIELD_WORDS) as [ReceiptField, RegExp][]) {
    if (words.test(text)) marked.add(field)
  }
  if (!reasons.some((reason) => Object.values(FIELD_WORDS).some((words) => words.test(reason)))) {
    marked.add('amount')
    marked.add('spentOn')
  }
  return marked
}
