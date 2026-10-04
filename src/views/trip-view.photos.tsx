import { CloudOff, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError } from '@/api/errors'
import type { Photo } from '@/api/queries/photos'
import { StatusMessage } from '@/components/shared/status-message'
import {
  PhotoGallery,
  PhotoGallerySkeleton,
  type PhotoSortKey,
} from '@/components/trips/photo-gallery'
import { PhotoViewer } from '@/components/trips/photo-viewer'
import { Button } from '@/components/ui/button'
import { usePhotoImage } from '@/hooks/use-photo-image'
import { NotAnImageError, useDeletePhoto, usePhotos, useUploadPhoto } from '@/hooks/use-photos'
import { PhotoDecodeError } from '@/lib/photo-resize'
import { PHOTOS_PAGE_SIZE } from '@/lib/trip-extras'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/trips_/$tripId')

/** The upload went wrong: say why in words a person can act on. */
function uploadMessage(error: unknown): string {
  if (error instanceof NotAnImageError) return m.photos_error_not_image()
  if (error instanceof PhotoDecodeError) {
    return error.heic ? m.photos_error_heic() : m.photos_error_not_image()
  }
  if (error instanceof ApiError) {
    if (error.status === 403) return m.photos_error_forbidden()
    // 413 and 422: too big, a format the API does not take, or the trip's photo limit.
    if (error.status === 413 || error.status === 422) return m.photos_error_rejected()
  }
  return m.photos_error_failed()
}

interface TripPhotosViewProps {
  tripId: string
  /** The host may delete anyone's photo; everyone deletes their own. */
  isHost: boolean
}

/** The Zdjęcia tab. Page, sort and owner filter live in the URL (ph_*). */
export function TripPhotosView({ tripId, isHost }: TripPhotosViewProps) {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const photos = usePhotos(tripId, {
    page: search.ph_page,
    size: PHOTOS_PAGE_SIZE,
    sort: search.ph_sort,
    dir: search.ph_dir,
    owner: search.ph_owner,
  })
  const uploader = useUploadPhoto(tripId)
  const deleter = useDeletePhoto(tripId)
  const [open, setOpen] = useState<Photo | null>(null)
  const image = usePhotoImage(tripId, open?.id)

  const setSearch = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const uploadAll = async (files: File[]) => {
    for (const file of files) {
      if (!(await uploader.upload(file))) return
    }
    // Back to the newest first: that is where a new photo appears.
    if (search.ph_sort !== 'created_at' || search.ph_dir !== 'desc') {
      setSearch({ ph_sort: 'created_at', ph_dir: 'desc', ph_page: 1 })
    }
  }

  if (photos.isPending) return <PhotoGallerySkeleton />

  if (photos.problem || !photos.page) {
    const offline = photos.problem === 'offline'
    return (
      <StatusMessage
        role="alert"
        icon={offline ? <CloudOff /> : <TriangleAlert />}
        title={offline ? m.trips_offline_title() : m.photos_load_failed_title()}
        action={
          <Button variant="outline" onClick={photos.refetch}>
            {m.action_retry()}
          </Button>
        }
      >
        {offline ? m.trips_offline_body() : m.trips_load_failed_body()}
      </StatusMessage>
    )
  }

  return (
    <>
      <PhotoGallery
        items={photos.page.items}
        total={photos.page.total}
        page={photos.page.page}
        pages={photos.page.pages}
        sort={search.ph_sort}
        dir={search.ph_dir}
        owner={search.ph_owner}
        isFetching={photos.isFetching}
        isUploading={uploader.isUploading}
        uploadError={uploader.error ? uploadMessage(uploader.error) : null}
        onOpen={setOpen}
        onUpload={(files) => void uploadAll(files)}
        onSortChange={(ph_sort: PhotoSortKey, ph_dir) => setSearch({ ph_sort, ph_dir, ph_page: 1 })}
        onOwnerChange={(ph_owner) => setSearch({ ph_owner, ph_page: 1 })}
        onPageChange={(ph_page) => setSearch({ ph_page })}
      />
      <PhotoViewer
        photo={open}
        imageUrl={image.url}
        failed={image.failed}
        canDelete={open !== null && (open.is_mine || isHost)}
        isDeleting={deleter.isDeleting}
        deleteFailed={deleter.error !== null}
        onDelete={() =>
          open &&
          void deleter.remove(open.id).then(
            () => setOpen(null),
            () => undefined,
          )
        }
        onClose={() => setOpen(null)}
      />
    </>
  )
}
