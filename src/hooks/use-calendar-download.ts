import { useMutation } from '@tanstack/react-query'
import { fetchClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { ICS_FILE_EXTENSION, ICS_FILE_PREFIX, PLAN_NOT_APPROVED_CODE } from '@/lib/constants'
import { saveBlob } from '@/lib/download'
import { detailCode } from '@/lib/proposals'

export type CalendarError = 'not_approved' | 'forbidden' | 'offline' | 'failed'

interface CalendarTarget {
  tripId: string
  planId: string
  /** The plan's short hash, for the file name. */
  planHash: string
}

/**
 * Downloads the approved plan as an `.ics` file. The request goes through the client, so it carries
 * the token; the answer is saved from a blob.
 */
export function useCalendarDownload({ tripId, planId, planHash }: CalendarTarget) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { data, response } = await fetchClient.GET(
        '/api/v1/trips/{trip_id}/plans/{plan_id}/calendar.ics',
        {
          params: { path: { trip_id: tripId, plan_id: planId } },
          parseAs: 'blob',
        },
      )
      if (!data) throw new ApiError(response.status, undefined)
      saveBlob(data, `${ICS_FILE_PREFIX}${planHash}${ICS_FILE_EXTENSION}`)
    },
  })

  const failure = mutation.error
  const error: CalendarError | null = !failure
    ? null
    : failure instanceof TypeError
      ? 'offline'
      : failure instanceof ApiError && failure.status === 403
        ? 'forbidden'
        : failure instanceof ApiError &&
            failure.status === 409 &&
            detailCode(failure.detail) === PLAN_NOT_APPROVED_CODE
          ? 'not_approved'
          : 'failed'

  return {
    download: () => mutation.mutate(),
    isPending: mutation.isPending,
    done: mutation.isSuccess,
    reset: mutation.reset,
    error,
  }
}
