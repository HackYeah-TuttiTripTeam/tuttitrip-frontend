import { CloudOff, Loader, MapPin, TriangleAlert } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import type { CityFetchFailure, CityFetchPhase } from '@/hooks/use-city-candidates'
import { m } from '@/paraglide/messages'
import { OsmAttribution } from './osm-attribution'

const FAILURE_BODY: Record<CityFetchFailure, () => string> = {
  external: m.places_failure_external,
  city_not_found: m.places_failure_city_not_found,
  no_places: m.places_failure_no_places,
  unknown: m.places_failure_unknown,
}

/** A retry helps when the service was busy; a city that does not exist needs another destination. */
const RETRYABLE: readonly CityFetchFailure[] = ['external', 'unknown', 'no_places']

interface CityFetchStatusProps {
  phase: CityFetchPhase
  /** The destination, as the trip names it; null when nothing is known. */
  cityName: string | null
  /** 0..100 from the job, null before the worker reports. */
  percent: number | null
  placesCount: number
  failure: CityFetchFailure | null
  isRetrying: boolean
  onRetry: () => void
}

/**
 * "Fetching places for the city": what is happening, how far it is, what to expect in the plan
 * (prices and hours of a new city are unverified) and, when it fails, why and how to try again.
 */
export function CityFetchStatus({
  phase,
  cityName,
  percent,
  placesCount,
  failure,
  isRetrying,
  onRetry,
}: CityFetchStatusProps) {
  const city = cityName ?? m.places_city_unknown()

  if (phase === 'failed') {
    const Icon = failure === 'external' ? CloudOff : TriangleAlert
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 border-t py-10 md:items-center md:py-16 md:text-center"
      >
        <Icon aria-hidden="true" className="size-6 text-muted-foreground" />
        <h2 className="font-medium text-base">{m.places_failed_title({ city })}</h2>
        <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
          {FAILURE_BODY[failure ?? 'unknown']()}
        </p>
        {failure !== null && RETRYABLE.includes(failure) && (
          <Button onClick={onRetry} disabled={isRetrying} className="h-11 md:h-9">
            {m.action_retry()}
          </Button>
        )}
        <OsmAttribution />
      </div>
    )
  }

  return (
    <div
      role="status"
      className="flex flex-col items-start gap-3 border-t py-10 md:items-center md:py-16 md:text-center"
    >
      <MapPin aria-hidden="true" className="size-6 text-muted-foreground" />
      <h2 className="font-medium text-base">{m.places_fetching_title({ city })}</h2>
      <p className="flex max-w-md items-center gap-2 text-muted-foreground text-sm leading-relaxed">
        <Loader
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
        />
        {phase === 'ready' ? m.places_ready_body() : m.places_fetching_body()}
      </p>
      {percent !== null && (
        <progress
          max={100}
          value={percent}
          aria-label={m.places_fetching_title({ city })}
          className="h-2 w-full max-w-md overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
        />
      )}
      {placesCount > 0 && (
        <p className="font-medium text-sm tabular-nums">{m.places_found({ count: placesCount })}</p>
      )}
      <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
        {m.places_unverified_note()}
      </p>
      <OsmAttribution />
    </div>
  )
}
