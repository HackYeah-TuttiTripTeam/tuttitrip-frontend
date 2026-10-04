import { m } from '@/paraglide/messages'

/** Marks the sample trip every new account gets, so nobody mistakes it for their own plan. */
export function SampleBadge() {
  return (
    <span className="w-fit rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground text-xs">
      {m.trip_sample_badge()}
    </span>
  )
}
