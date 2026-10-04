import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import { type PhotosQuery, photosKey, photosQueryOptions, uploadPhoto } from '@/api/queries/photos'
import { isPhotoFile, preparePhoto } from '@/lib/photo-resize'

/** One page of the gallery (thumbnails only). */
export function usePhotos(tripId: string, query: PhotosQuery) {
  const result = useQuery({
    ...photosQueryOptions(tripId, query),
    placeholderData: keepPreviousData,
  })
  return {
    page: result.data,
    isPending: result.isPending,
    isFetching: result.isFetching,
    problem: result.isError ? classifyApiError(result.error) : null,
    refetch: () => void result.refetch(),
  }
}

/** Raised for a file the browser cannot show; the form explains it. */
export class NotAnImageError extends Error {}

/** Upload: shrink and strip the metadata in a canvas first, then send picture and thumbnail. */
export function useUploadPhoto(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      if (!isPhotoFile(file)) throw new NotAnImageError()
      const { image, thumbnail } = await preparePhoto(file)
      return uploadPhoto(tripId, image, thumbnail)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photosKey(tripId) }),
  })
  return {
    /** True when the photo is stored; the reason of a failure is in `error`. */
    upload: (file: File) =>
      mutation.mutateAsync(file).then(
        () => true,
        () => false,
      ),
    isUploading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}

export function useDeletePhoto(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('delete', '/api/v1/trips/{trip_id}/photos/{photo_id}', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photosKey(tripId) }),
  })
  return {
    remove: (photoId: string) =>
      mutation.mutateAsync({ params: { path: { trip_id: tripId, photo_id: photoId } } }),
    isDeleting: mutation.isPending,
    error: mutation.error,
  }
}
