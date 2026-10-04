import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  RECEIPT_POLL_LIMIT_MS,
  RECEIPT_POLL_MS,
  type ReceiptAccepted,
  receiptQueryOptions,
  uploadReceipt,
} from '@/api/queries/receipts'
import { type ReceiptFailure, receiptFailure } from '@/lib/receipt-failure'
import {
  browserCodec,
  isReceiptImage,
  prepareReceipt,
  ReceiptImageError,
} from '@/lib/receipt-image'
import { useJob } from './use-job'

export type ReceiptPhase = 'idle' | 'preparing' | 'uploading' | 'reading' | 'ready' | 'failed'

/**
 * A receipt photo from the picker to the draft: shrink in the browser (no EXIF leaves the phone),
 * upload, then ask about the reading until it is `ready` (the draft to confirm) or `failed`. The
 * shrunk photo is kept, so "try again" after a lost connection needs no new photo.
 */
export function useReceipt(tripId: string) {
  const [phase, setPhase] = useState<ReceiptPhase>('idle')
  const [failure, setFailure] = useState<ReceiptFailure | null>(null)
  const [accepted, setAccepted] = useState<ReceiptAccepted | null>(null)
  const prepared = useRef<Blob | null>(null)
  const startedAt = useRef(0)

  const upload = useMutation({
    mutationFn: (image: Blob) => uploadReceipt(tripId, image),
    onSuccess: (result) => {
      startedAt.current = Date.now()
      setAccepted(result)
      setPhase('reading')
    },
    onError: (error) => {
      setFailure(receiptFailure(error))
      setPhase('failed')
    },
  })

  const reading = useQuery({
    ...receiptQueryOptions(tripId, accepted?.evidence_id ?? ''),
    enabled: accepted !== null && phase === 'reading',
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' &&
      Date.now() - startedAt.current < RECEIPT_POLL_LIMIT_MS
        ? RECEIPT_POLL_MS
        : false,
  })
  const job = useJob(accepted !== null && phase === 'reading' ? accepted.workflow_id : null)

  const status = reading.data?.status
  const stalled =
    phase === 'reading' &&
    status === 'pending' &&
    !reading.isFetching &&
    Date.now() - startedAt.current >= RECEIPT_POLL_LIMIT_MS
  // The phase follows the answers: ready and failed come from the API, a dead connection from the query.
  const effectivePhase: ReceiptPhase =
    phase === 'reading' && status === 'ready'
      ? 'ready'
      : phase === 'reading' && (status === 'failed' || reading.isError || stalled)
        ? 'failed'
        : phase
  const effectiveFailure: ReceiptFailure | null =
    effectivePhase !== 'failed'
      ? null
      : (failure ?? (reading.isError ? receiptFailure(reading.error) : 'unreadable'))

  const send = (image: Blob) => {
    setFailure(null)
    setPhase('uploading')
    upload.mutate(image)
  }

  return {
    phase: effectivePhase,
    failure: effectiveFailure,
    /** 0..100 from the job, or null while the worker has not reported yet. */
    percent: job.progress?.percent ?? null,
    evidenceId: accepted?.evidence_id ?? null,
    receipt: status === 'ready' ? reading.data : undefined,
    /** Picks up a photo from the file input. */
    start: async (file: File) => {
      setFailure(null)
      setAccepted(null)
      if (!isReceiptImage(file)) {
        setFailure('type_not_allowed')
        setPhase('failed')
        return
      }
      setPhase('preparing')
      try {
        prepared.current = await prepareReceipt(file, browserCodec())
      } catch (error) {
        setFailure(error instanceof ReceiptImageError ? error.reason : receiptFailure(error))
        setPhase('failed')
        return
      }
      send(prepared.current)
    },
    /** Sends the kept photo again, or asks about the reading again when it was already sent. */
    retry: () => {
      if (accepted !== null) {
        startedAt.current = Date.now()
        setFailure(null)
        setPhase('reading')
        void reading.refetch()
      } else if (prepared.current) send(prepared.current)
    },
    reset: () => {
      prepared.current = null
      setAccepted(null)
      setFailure(null)
      setPhase('idle')
    },
  }
}
