import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { $api } from '@/api/client'
import { ApiError, classifyApiError } from '@/api/errors'
import { JOB_POLL_MS } from '@/api/queries/jobs'
import { pasteQueryOptions } from '@/api/queries/linter'
import { useJob } from './use-job'

export type PasteFailure = 'offline' | 'too_long' | 'unavailable' | 'forbidden' | 'unknown'

const HTTP_TOO_LONG = [413, 422]
const HTTP_UNAVAILABLE = 503

function pasteFailure(error: unknown): PasteFailure {
  if (error instanceof TypeError) return 'offline'
  if (!(error instanceof ApiError)) return 'unknown'
  if (error.status === 403) return 'forbidden'
  if (error.status === HTTP_UNAVAILABLE) return 'unavailable'
  if (HTTP_TOO_LONG.includes(error.status)) return 'too_long'
  return 'unknown'
}

/**
 * A plan pasted from a chatbot: save the text (the worker starts reading it), ask about the report
 * until it is done, and let the host choose a candidate for an item that was not recognised (the
 * report is recounted by the API). The paste id lives in the URL, so a reload keeps the report.
 */
export function usePasteLint(
  tripId: string,
  pasteId: string | undefined,
  onCreated: (pasteId: string) => void,
) {
  const queryClient = useQueryClient()
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  const create = $api.useMutation('post', '/api/v1/trips/{trip_id}/linter/pastes', {
    onSuccess: (accepted) => {
      setWorkflowId(accepted.workflow_id)
      onCreated(accepted.paste_id)
    },
  })
  const query = useQuery({
    ...pasteQueryOptions(tripId, pasteId ?? ''),
    enabled: pasteId !== undefined,
    refetchInterval: (current) => (current.state.data?.status === 'pending' ? JOB_POLL_MS : false),
  })
  const job = useJob(query.data?.status === 'pending' ? workflowId : null)
  const choose = $api.useMutation(
    'patch',
    '/api/v1/trips/{trip_id}/linter/pastes/{paste_id}/items/{index}',
    {
      onSuccess: (report) => {
        if (pasteId) {
          queryClient.setQueryData(pasteQueryOptions(tripId, pasteId).queryKey, report)
        }
      },
    },
  )

  const paste = query.data
  return {
    paste,
    isReading: pasteId !== undefined && (query.isPending || paste?.status === 'pending'),
    isFailed: paste?.status === 'failed',
    /** 0..100 from the job while the worker reads, null before it reports. */
    percent: job.progress?.percent ?? null,
    loadProblem: query.isError ? classifyApiError(query.error) : null,
    submit: (text: string) =>
      create.mutate({ params: { path: { trip_id: tripId } }, body: { text } }),
    isSubmitting: create.isPending,
    submitFailure: create.isError ? pasteFailure(create.error) : null,
    resetSubmit: create.reset,
    choose: (index: number, placeId: string) =>
      pasteId &&
      choose.mutate({
        params: { path: { trip_id: tripId, paste_id: pasteId, index } },
        body: { place_id: placeId },
      }),
    choosingIndex: choose.isPending ? choose.variables.params.path.index : null,
    chooseFailed: choose.isError,
    refetch: () => void query.refetch(),
  }
}
