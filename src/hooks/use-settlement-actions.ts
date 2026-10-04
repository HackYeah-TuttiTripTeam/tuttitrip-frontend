import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { expensesListKey } from '@/api/queries/expenses'
import { paymentsKey, settlementKey } from '@/api/queries/settlement'
import { m } from '@/paraglide/messages'

/** Why a settlement write failed, in words: 403 (not allowed), 409 (frozen, or drafts waiting). */
export function settlementWriteFailure(error: unknown, kind: 'state' | 'payment'): string {
  if (error instanceof ApiError && error.status === 403) return m.settlement_error_forbidden()
  if (error instanceof ApiError && error.status === 409) {
    return kind === 'state' ? m.settlement_error_drafts() : m.expense_error_closed()
  }
  return kind === 'state' ? m.settlement_error_state_failed() : m.settlement_error_payment_failed()
}

/**
 * Close or reopen the settlement (host only) and mark transfers as paid. Every write fetches the
 * settlement again: the API computes what is still to pay, nothing is edited on the client.
 */
export function useSettlementActions(tripId: string) {
  const queryClient = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: settlementKey(tripId) }),
      queryClient.invalidateQueries({ queryKey: paymentsKey(tripId) }),
      queryClient.invalidateQueries({ queryKey: expensesListKey }),
    ])
  }
  const close = $api.useMutation('post', '/api/v1/trips/{trip_id}/expenses/settlement/close', {
    onSuccess: refresh,
  })
  const reopen = $api.useMutation('post', '/api/v1/trips/{trip_id}/expenses/settlement/reopen', {
    onSuccess: refresh,
  })
  const markPaid = $api.useMutation(
    'post',
    '/api/v1/trips/{trip_id}/expenses/settlement/payments',
    { onSuccess: refresh },
  )
  const removePayment = $api.useMutation(
    'delete',
    '/api/v1/trips/{trip_id}/expenses/settlement/payments/{payment_id}',
    { onSuccess: refresh },
  )

  return { close, reopen, markPaid, removePayment }
}
