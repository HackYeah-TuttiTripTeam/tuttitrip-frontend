import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { isJobFinished, JOB_POLL_MS, jobQueryOptions } from '@/api/queries/jobs'

/**
 * One background job, asked about every `JOB_POLL_MS` until it is finished (polling stops itself;
 * `progress` comes from the worker's `progress` event). `workflowId` null: nothing to ask.
 */
export function useJob(workflowId: string | null) {
  const query = useQuery({
    ...jobQueryOptions(workflowId ?? ''),
    enabled: workflowId !== null,
    refetchInterval: (current) => (isJobFinished(current.state.data) ? false : JOB_POLL_MS),
  })
  const job = query.data
  return {
    job,
    progress: job?.progress ?? null,
    isFinished: isJobFinished(job),
    isSuccess: job?.status === 'SUCCESS',
    isFailed: isJobFinished(job) && job?.status !== 'SUCCESS',
    errorCode: job?.error_code ?? null,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}
