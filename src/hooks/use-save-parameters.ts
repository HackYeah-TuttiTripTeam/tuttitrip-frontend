import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import {
  type ParametersVersion,
  parametersQueryOptions,
  versionsQueryOptions,
} from '@/api/queries/planning-parameters'
import {
  mapValidationErrors,
  type ParameterKey,
  type PlanningFormValues,
  toRequest,
} from '@/lib/planning-parameters'
import { m } from '@/paraglide/messages'

export type ParameterErrors = Partial<Record<ParameterKey, string>>

const HISTORY_KEY = versionsQueryOptions({ page: 1, size: 1, dir: 'desc' }).queryKey.slice(0, 2)

/**
 * POST a new version. The answer replaces the version in force and the history is fetched again;
 * a 422 is mapped onto the parameters it names.
 */
export function useSaveParameters() {
  const queryClient = useQueryClient()
  const create = $api.useMutation('post', '/api/v1/admin/planning/parameters')
  const [fieldErrors, setFieldErrors] = useState<ParameterErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const reset = () => {
    setFieldErrors({})
    setSubmitError(null)
    create.reset()
  }

  const submit = async (form: PlanningFormValues): Promise<ParametersVersion | null> => {
    setFieldErrors({})
    setSubmitError(null)
    try {
      const saved = await create.mutateAsync({ body: toRequest(form) })
      queryClient.setQueryData(parametersQueryOptions().queryKey, saved)
      await queryClient.invalidateQueries({ queryKey: HISTORY_KEY })
      return saved
    } catch (error) {
      const errors =
        error instanceof ApiError && error.status === 422 ? mapValidationErrors(error.detail) : {}
      if (Object.keys(errors).length > 0) setFieldErrors(errors)
      else
        setSubmitError(
          error instanceof ApiError && error.status === 403
            ? m.planning_save_forbidden()
            : m.planning_save_failed(),
        )
      return null
    }
  }

  return { submit, isPending: create.isPending, fieldErrors, submitError, reset }
}
