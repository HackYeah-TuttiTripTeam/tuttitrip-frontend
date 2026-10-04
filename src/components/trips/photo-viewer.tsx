import type { Photo } from '@/api/queries/photos'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatTime } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface PhotoViewerProps {
  photo: Photo | null
  /** Object URL of the full picture; undefined while it loads. */
  imageUrl: string | undefined
  failed: boolean
  canDelete: boolean
  isDeleting: boolean
  deleteFailed: boolean
  onDelete: () => void
  onClose: () => void
}

/** The full picture in a dialog, with who added it and, for the author or the host, delete. */
export function PhotoViewer({
  photo,
  imageUrl,
  failed,
  canDelete,
  isDeleting,
  deleteFailed,
  onDelete,
  onClose,
}: PhotoViewerProps) {
  const author = photo?.author_name ?? m.photos_author_left()
  return (
    <Dialog open={photo !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{m.photos_viewer_title({ author })}</DialogTitle>
          <DialogDescription>
            {photo && `${formatDate(photo.created_at)}, ${formatTime(photo.created_at)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={m.photos_viewer_alt({ author })}
              className="max-h-[68dvh] max-w-full rounded-md object-contain"
            />
          ) : failed ? (
            <p role="alert" className="text-destructive text-sm">
              {m.photos_image_failed()}
            </p>
          ) : (
            <Skeleton aria-hidden="true" className="aspect-[4/3] w-full rounded-md" />
          )}
        </div>
        {deleteFailed && (
          <p role="alert" className="text-destructive text-sm">
            {m.photos_delete_failed()}
          </p>
        )}
        {canDelete && (
          <Button variant="outline" className="h-11" disabled={isDeleting} onClick={onDelete}>
            {isDeleting ? m.photos_deleting() : m.photos_delete()}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
