import { cn } from '@/lib/utils'

const MARK = { light: '/brand/tuttitrip-mark-light.svg', dark: '/brand/tuttitrip-mark-dark.svg' }
const LOGO = {
  light: '/brand/tuttitrip-logo-horizontal-light.svg',
  dark: '/brand/tuttitrip-logo-horizontal-dark.svg',
}

/**
 * Light and dark files of one logo; the `.dark` class (see index.html) picks the visible one.
 * The files are the design system's, unmodified: the sky is lighter in the dark theme and the
 * wordmark switches colour, so the `-light` file never sits on a dark surface.
 */
function Themed({
  files,
  alt,
  className,
}: {
  files: { light: string; dark: string }
  alt: string
  className?: string
}) {
  // Two images, one hidden by CSS: the `.dark` class (not a media query) decides, at the cost of a second small fetch.
  return (
    <>
      <img src={files.light} alt={alt} className={cn('dark:hidden', className)} />
      <img src={files.dark} alt={alt} className={cn('hidden dark:block', className)} />
    </>
  )
}

/** The "Horyzont" mark: a round badge with a road running to the horizon (design system, min 24px). */
export function BrandMark({ className, alt = '' }: { className?: string; alt?: string }) {
  return <Themed files={MARK} alt={alt} className={cn('size-6', className)} />
}

/** Mark and wordmark side by side, as drawn in the design system; the wordmark is outlined, never retyped. */
export function BrandLogo({ className, alt = 'TuttiTrip' }: { className?: string; alt?: string }) {
  return <Themed files={LOGO} alt={alt} className={cn('h-9 w-auto', className)} />
}
