import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchPhotoImage } from '@/api/queries/photos'

/**
 * The full picture of one photo as an object URL (the endpoint needs the bearer token, so the
 * browser cannot load it from an <img src>). Only fetched while the viewer is open; the URL is
 * released when the viewer closes or switches photo.
 */
export function usePhotoImage(tripId: string, photoId: string | undefined) {
  const query = useQuery({
    queryKey: ['photo-image', tripId, photoId],
    queryFn: () => fetchPhotoImage(tripId, photoId ?? ''),
    enabled: photoId !== undefined,
    // A blob is not worth keeping in the cache after the viewer closes.
    gcTime: 0,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const [url, setUrl] = useState<string | undefined>()
  const blob = query.data
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return { url, isPending: query.isPending && query.fetchStatus !== 'idle', failed: query.isError }
}
