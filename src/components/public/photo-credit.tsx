import { EXTERNAL_LINK } from '@/lib/links'
import { PHOTOS, type PhotoId } from '@/lib/photos'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

const linkClass =
  'rounded-sm underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'

/**
 * "Photo: <author> / Unsplash". The author links to their Unsplash profile and "Unsplash" to the
 * photo's page, as the Unsplash guidelines ask. The team's own photo has no credit.
 */
export function PhotoCredit({ id, className }: { id: PhotoId; className?: string }) {
  const credit = PHOTOS[id].credit
  if (!credit) return null
  return (
    <p className={cn('text-muted-foreground text-xs leading-snug', className)}>
      {m.photo_credit_label()}{' '}
      <a
        href={`${credit.authorUrl}?utm_source=tuttitrip&utm_medium=referral`}
        className={linkClass}
        {...EXTERNAL_LINK}
      >
        {credit.author}
      </a>{' '}
      /{' '}
      <a
        href={`${credit.photoUrl}?utm_source=tuttitrip&utm_medium=referral`}
        className={linkClass}
        aria-label={`${m.photo_credit_photo()} (${credit.author}), ${m.external_link_new_tab()}`}
        {...EXTERNAL_LINK}
      >
        Unsplash
      </a>
    </p>
  )
}
