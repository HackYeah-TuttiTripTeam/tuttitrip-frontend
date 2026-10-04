import { CircleAlert, CircleCheck } from '@keyline-icons/react'
import type { Expense } from '@/api/queries/expenses'
import { expenseToFormValues } from '@/lib/expense-form'
import { uncertainFields } from '@/lib/receipt-confidence'
import { m } from '@/paraglide/messages'
import { ExpenseForm } from './expense-form'
import type { PersonOption } from './person-option'

interface ReceiptConfirmCardProps {
  draft: Expense
  people: PersonOption[]
  tripCurrency: string | null
  /** The stored photo, when it can be shown next to the fields. */
  imageUrl: string | null
  /** From the reader; null for a draft opened from the list, where only missing values are marked. */
  needsConfirmation: boolean | null
  reasons: string[]
  fieldErrors: React.ComponentProps<typeof ExpenseForm>['fieldErrors']
  submitError: string | null
  isSubmitting: boolean
  onSubmit: React.ComponentProps<typeof ExpenseForm>['onSubmit']
}

/**
 * What the reader found on a receipt, as the expense form: every field can be corrected, the ones
 * the reader was unsure about are marked, and nothing counts in the settlement until "Confirm".
 */
export function ReceiptConfirmCard({
  draft,
  people,
  tripCurrency,
  imageUrl,
  needsConfirmation,
  reasons,
  fieldErrors,
  submitError,
  isSubmitting,
  onSubmit,
}: ReceiptConfirmCardProps) {
  const unsure = needsConfirmation === true
  const Icon = unsure ? CircleAlert : CircleCheck
  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm ${unsure ? 'bg-warning-soft text-warning-ink' : 'bg-muted'}`}
      >
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">
            {unsure ? m.receipt_unsure_title() : m.receipt_sure_title()}
          </p>
          <p>{unsure ? m.receipt_unsure_body() : m.receipt_sure_body()}</p>
          {unsure && reasons.length > 0 && (
            <ul className="list-disc pl-5">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={m.receipt_image_alt()}
          className="max-h-48 w-full rounded-md border object-contain"
        />
      )}
      <ExpenseForm
        people={people}
        tripCurrency={tripCurrency}
        initial={expenseToFormValues(draft, tripCurrency !== null)}
        uncertain={uncertainFields(draft, needsConfirmation, reasons)}
        fieldErrors={fieldErrors}
        submitError={submitError}
        isSubmitting={isSubmitting}
        submitLabel={m.receipt_confirm()}
        submittingLabel={m.expense_form_submitting()}
        onSubmit={onSubmit}
      />
    </div>
  )
}
