import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { expensesListKey } from '@/api/queries/expenses'
import { settlementKey } from '@/api/queries/settlement'

/** DELETE one expense (204); the list and the settlement are fetched again. */
export function useDeleteExpense(tripId: string) {
  const queryClient = useQueryClient()
  return $api.useMutation('delete', '/api/v1/trips/{trip_id}/expenses/{expense_id}', {
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: expensesListKey }),
        queryClient.invalidateQueries({ queryKey: settlementKey(tripId) }),
      ])
    },
  })
}
