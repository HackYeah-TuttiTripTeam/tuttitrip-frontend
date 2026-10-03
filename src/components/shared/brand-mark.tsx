import { cn } from '@/lib/utils'

/** Start point, two steps, destination: the TuttiTrip mark (same as public/logo.svg). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-6', className)}>
      <g className="fill-current">
        <circle cx="7.5" cy="16.5" r="3" />
        <circle cx="11.2" cy="12.8" r="0.9" />
        <circle cx="13.6" cy="10.4" r="0.9" />
      </g>
      <g className="text-primary">
        <circle cx="17" cy="7" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="17" cy="7" r="0.9" fill="currentColor" />
      </g>
    </svg>
  )
}
