import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchReceiptImage } from '@/api/queries/receipts'

/** An object URL of the stored receipt photo for the card, revoked when the card goes away. */
export function useReceiptImage(tripId: string, evidenceId: string | null): string | null {
  const query = useQuery({
    queryKey: ['receipt-image', tripId, evidenceId],
    queryFn: () => fetchReceiptImage(tripId, evidenceId ?? ''),
    enabled: evidenceId !== null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!query.data) return undefined
    const created = URL.createObjectURL(query.data)
    setUrl(created)
    return () => {
      URL.revokeObjectURL(created)
      setUrl(null)
    }
  }, [query.data])
  return url
}
