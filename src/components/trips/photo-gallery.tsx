import { ImagePlus, Images } from '@keyline-icons/react'
import { useRef } from 'react'
import type { Photo, PhotoOwner } from '@/api/queries/photos'
import { Pager } from '@/components/shared/pager'
import { SortControls } from '@/components/shared/sort-controls'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDate } from '@/lib/format'
import { PHOTOS_PAGE_SIZE } from '@/lib/trip-extras'
import { m } from '@/paraglide/messages'

export type PhotoSortKey = 'created_at' | 'size_bytes'

const SORT_LABELS: Record<PhotoSortKey, () => string> = {
  created_at: m.photos_sort_date,
  size_bytes: m.photos_sort_size,
}

const OWNER_LABELS: Record<PhotoOwner, () => string> = {
  all: m.photos_owner_all,
  mine: m.photos_owner_mine,
  others: m.photos_owner_others,
}

interface PhotoGalleryProps {
  items: Photo[]
  total: number
  page: number
  pages: number
  sort: PhotoSortKey
  dir: 'asc' | 'desc'
  owner: PhotoOwner
  isFetching: boolean
  isUploading: boolean
  /** Why the last upload failed, already worded for people; null when it did not. */
  uploadError: string | null
  onOpen: (photo: Photo) => void
  onUpload: (files: File[]) => void
  onSortChange: (sort: PhotoSortKey, dir: 'asc' | 'desc') => void
  onOwnerChange: (owner: PhotoOwner) => void
  onPageChange: (page: number) => void
}

/** The trip's photos: thumbnails (loaded lazily) in a grid, a tap opens the full picture. */
export function PhotoGallery({
  items,
  total,
  page,
  pages,
  sort,
  dir,
  owner,
  isFetching,
  isUploading,
  uploadError,
  onOpen,
  onUpload,
  onSortChange,
  onOwnerChange,
  onPageChange,
}: PhotoGalleryProps) {
  const picker = useRef<HTMLInputElement>(null)
  const filtered = owner !== 'all'
  const upload = (
    <>
      <input
        ref={picker}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label={m.photos_file_input()}
        data-testid="photo-input"
        onChange={(event) => {
          onUpload([...(event.target.files ?? [])])
          // The same file can be picked again after a failure.
          event.target.value = ''
        }}
      />
      <Button
        className="h-11 shrink-0 md:h-9"
        disabled={isUploading}
        onClick={() => picker.current?.click()}
      >
        <ImagePlus aria-hidden="true" />
        {isUploading ? m.photos_uploading() : m.photos_add()}
      </Button>
    </>
  )

  return (
    <section aria-labelledby="photos-heading" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <h2 id="photos-heading" className="font-medium text-lg">
            {m.photos_title()}
          </h2>
          <p className="text-muted-foreground text-sm">{m.photos_lead()}</p>
        </div>
        {upload}
      </div>

      <div role="status" className={uploadError ? 'text-destructive text-sm' : 'sr-only'}>
        {isUploading ? m.photos_uploading_status() : uploadError}
      </div>

      {(total > 0 || filtered) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToggleGroup
            type="single"
            value={owner}
            aria-label={m.photos_owner_label()}
            onValueChange={(value) => {
              const next = (Object.keys(OWNER_LABELS) as PhotoOwner[]).find((key) => key === value)
              if (next) onOwnerChange(next)
            }}
          >
            {(Object.keys(OWNER_LABELS) as PhotoOwner[]).map((key) => (
              <ToggleGroupItem key={key} value={key}>
                {OWNER_LABELS[key]()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <SortControls sort={sort} dir={dir} labels={SORT_LABELS} onChange={onSortChange} />
        </div>
      )}

      {items.length === 0 ? (
        <StatusMessage
          icon={<Images />}
          title={filtered ? m.photos_no_match() : m.photos_empty_title()}
        >
          {filtered ? m.photos_no_match_body() : m.photos_empty_body()}
        </StatusMessage>
      ) : (
        <ul
          aria-label={m.photos_list_label()}
          aria-busy={isFetching}
          className={`grid grid-cols-3 gap-1.5 transition-opacity md:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}
        >
          {items.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => onOpen(photo)}
                aria-label={m.photos_open({
                  author: photo.author_name ?? m.photos_author_left(),
                  date: formatDate(photo.created_at),
                })}
                className="block aspect-square w-full overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <img
                  src={photo.thumbnail}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} pages={pages} onPageChange={onPageChange} disabled={isFetching} />
    </section>
  )
}

export function PhotoGallerySkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-3 gap-1.5 md:grid-cols-4">
      {Array.from({ length: PHOTOS_PAGE_SIZE / 2 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholders
        <Skeleton key={index} className="aspect-square w-full rounded-md" />
      ))}
    </div>
  )
}
