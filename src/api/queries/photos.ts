import { $api, fetchClient, type Schemas } from '@/api/client'

export type Photo = Schemas['PhotoRead']
export type PhotoSort = Schemas['PhotoSort']
export type SortDir = Schemas['SortDir']
/** Whose photos to show: everyone's, only mine or only the others'. */
export type PhotoOwner = 'all' | 'mine' | 'others'

export interface PhotosQuery {
  page: number
  size: number
  sort: PhotoSort
  dir: SortDir
  owner: PhotoOwner
}

const MINE_FILTER: Record<PhotoOwner, boolean | undefined> = {
  all: undefined,
  mine: true,
  others: false,
}

/** One page of the gallery, thumbnails inlined as data: URLs (no second request per photo). */
export const photosQueryOptions = (tripId: string, { owner, ...query }: PhotosQuery) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/photos', {
    params: { path: { trip_id: tripId }, query: { ...query, mine: MINE_FILTER[owner] } },
  })

/** Prefix of every gallery page of a trip, to invalidate them all after an upload or a delete. */
export const photosKey = (tripId: string) =>
  ['get', '/api/v1/trips/{trip_id}/photos', { params: { path: { trip_id: tripId } } }] as const

/**
 * `multipart/form-data` with the two parts the API wants. openapi-fetch types the binary parts as
 * strings, so the typed body is a placeholder and the serializer sends the real blobs.
 */
export async function uploadPhoto(tripId: string, image: Blob, thumbnail: Blob): Promise<Photo> {
  const form = new FormData()
  form.append('image', image, 'photo.jpg')
  form.append('thumbnail', thumbnail, 'thumbnail.jpg')
  const { data } = await fetchClient.POST('/api/v1/trips/{trip_id}/photos', {
    params: { path: { trip_id: tripId } },
    body: { image: '', thumbnail: '' },
    bodySerializer: () => form,
  })
  if (!data) throw new Error('Empty answer from the photo upload')
  return data
}

/** The full picture; the endpoint needs the bearer token, so it cannot be an <img src>. */
export async function fetchPhotoImage(tripId: string, photoId: string): Promise<Blob> {
  const { data } = await fetchClient.GET('/api/v1/trips/{trip_id}/photos/{photo_id}/image', {
    params: { path: { trip_id: tripId, photo_id: photoId } },
    parseAs: 'blob',
  })
  if (!data) throw new Error('Empty answer from the photo image')
  return data
}
