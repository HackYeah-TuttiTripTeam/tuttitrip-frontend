import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import {
  parametersQueryOptions,
  type VersionsParams,
  versionsQueryOptions,
} from '@/api/queries/planning-parameters'

/** The parameters in force and one page of their history; both wait for admin access. */
export function usePlanningParameters(enabled: boolean, history: VersionsParams) {
  const current = useQuery({ ...parametersQueryOptions(), enabled })
  const versions = useQuery({ ...versionsQueryOptions(history), enabled })
  return {
    current: current.data,
    versions: versions.data,
    isPending: enabled && current.isPending,
    historyPending: enabled && versions.isPending,
    problem: current.isError ? classifyApiError(current.error) : null,
    historyProblem: versions.isError ? classifyApiError(versions.error) : null,
    refetch: () => {
      void current.refetch()
      void versions.refetch()
    },
  }
}
