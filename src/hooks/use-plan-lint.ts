import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { planLintQueryOptions } from '@/api/queries/linter'

/** The real lint of the current version of the trip's plan (the number next to the chatbot's). */
export function usePlanLint(tripId: string, planId: string | undefined) {
  const query = useQuery({
    ...planLintQueryOptions(tripId, planId ?? ''),
    enabled: planId !== undefined,
  })
  return {
    report: query.data,
    isPending: planId !== undefined && query.isPending,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
