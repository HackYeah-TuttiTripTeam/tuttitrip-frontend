import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { expensesListKey } from '@/api/queries/expenses'
import { settlementKey } from '@/api/queries/settlement'
import {
  type ExpenseFormField,
  type ExpenseFormValues,
  expenseWriteFailure,
  formValuesToBody,
  mapExpenseErrors,
} from '@/lib/expense-form'
import { m } from '@/paraglide/messages'

export type ExpenseFieldErrors = Partial<Record<ExpenseFormField, string>>

/** Create (expenseId null), edit or, for a draft read from a receipt (`confirming`), confirm one expense; a 422 is mapped onto the fields it names. */
export function useSaveExpense(tripId: string, expenseId: string | null, confirming = false) {
  const queryClient = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: expensesListKey }),
      queryClient.invalidateQueries({ queryKey: settlementKey(tripId) }),
    ])
  }
  const create = $api.useMutation('post', '/api/v1/trips/{trip_id}/expenses', {
    onSuccess: refresh,
  })
  const update = $api.useMutation('patch', '/api/v1/trips/{trip_id}/expenses/{expense_id}', {
    onSuccess: refresh,
  })
  const confirm = $api.useMutation(
    'post',
    '/api/v1/trips/{trip_id}/expenses/{expense_id}/confirm',
    { onSuccess: refresh },
  )
  const [fieldErrors, setFieldErrors] = useState<ExpenseFieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const reset = () => {
    setFieldErrors({})
    setSubmitError(null)
  }

  /** True when saved. */
  const submit = async (values: ExpenseFormValues): Promise<boolean> => {
    reset()
    try {
      if (expenseId === null) {
        await create.mutateAsync({
          params: { path: { trip_id: tripId } },
          body: formValuesToBody(values),
        })
      } else if (confirming) {
        // The card sends every field as shown: what the person saw is what is stored.
        await confirm.mutateAsync({
          params: { path: { trip_id: tripId, expense_id: expenseId } },
          body: formValuesToBody(values),
        })
      } else {
        await update.mutateAsync({
          params: { path: { trip_id: tripId, expense_id: expenseId } },
          body: formValuesToBody(values),
        })
      }
      return true
    } catch (error) {
      const errors =
        error instanceof ApiError && error.status === 422 ? mapExpenseErrors(error.detail) : {}
      if (Object.keys(errors).length > 0) setFieldErrors(errors)
      else setSubmitError(expenseWriteFailure(error, m.expense_error_save_failed()))
      return false
    }
  }

  return {
    submit,
    reset,
    isPending: create.isPending || update.isPending || confirm.isPending,
    fieldErrors,
    submitError,
  }
}
