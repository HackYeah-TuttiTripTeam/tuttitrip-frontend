import { $api, type Schemas } from '@/api/client'

export type Job = Schemas['JobState']
export type JobProgress = Schemas['Progress']

/** How often a running job is asked about; the worker reports progress at about this pace. */
export const JOB_POLL_MS = 2000

/** The workflow statuses after which nothing changes any more (DBOS's names, see `JobState`). */
const FINISHED_STATUSES = ['SUCCESS', 'ERROR', 'CANCELLED', 'MAX_RECOVERY_ATTEMPTS_EXCEEDED']

export const isJobFinished = (job: Pick<Job, 'status'> | undefined): boolean =>
  job !== undefined && FINISHED_STATUSES.includes(job.status)

export const jobQueryOptions = (workflowId: string) =>
  $api.queryOptions('get', '/api/v1/jobs/{workflow_id}', {
    params: { path: { workflow_id: workflowId } },
  })
