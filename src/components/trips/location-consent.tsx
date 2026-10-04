import { MapPinOff, Navigation } from '@keyline-icons/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDate, formatTime } from '@/lib/format'
import { DEFAULT_SHARE_DURATION_MIN, SHARE_DURATIONS_MIN } from '@/lib/trip-extras'
import { m } from '@/paraglide/messages'
import type { GeoStatus } from '@/stores/location-store'

const MINUTES_PER_HOUR = 60

interface LocationConsentProps {
  enabled: boolean
  /** On at the server, but started elsewhere: this tab sends nothing until the person resumes. */
  resumable: boolean
  /** When the current consent lapses (ISO); null while off. */
  until: string | null
  isChanging: boolean
  /** The device refused or cannot locate; explained under the buttons. */
  geoStatus: GeoStatus
  failed: boolean
  /** The first position after the consent could not be sent. */
  sendError: boolean
  /** The browser has no geolocation at all. */
  unsupported: boolean
  onStart: (minutes: number) => void
  onResume: () => void
  onStop: () => void
}

/**
 * The opt-in. Nothing is shared until the person picks a duration and presses the button; stopping
 * is one press and deletes the position on the server. Says what is stored and for how long.
 */
export function LocationConsent({
  enabled,
  resumable,
  until,
  isChanging,
  geoStatus,
  failed,
  sendError,
  unsupported,
  onStart,
  onResume,
  onStop,
}: LocationConsentProps) {
  const [minutes, setMinutes] = useState<number>(DEFAULT_SHARE_DURATION_MIN)

  return (
    <section aria-labelledby="share-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="share-heading" className="font-medium text-lg">
          {m.share_title()}
        </h2>
        <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
          {m.share_explain()}
        </p>
      </div>

      {resumable && (
        <div className="flex flex-col items-start gap-2">
          <p role="status" className="text-sm">
            {m.share_resume_hint()}
          </p>
          <Button className="h-11 rounded-full px-5" disabled={isChanging} onClick={onResume}>
            {m.share_resume()}
          </Button>
        </div>
      )}

      {enabled && until ? (
        <p role="status" className="flex items-center gap-2 font-medium text-sm">
          <Navigation aria-hidden="true" className="size-4 text-primary" />
          {m.share_on({ time: `${formatDate(until)}, ${formatTime(until)}` })}
        </p>
      ) : (
        <p role="status" className="flex items-center gap-2 text-muted-foreground text-sm">
          <MapPinOff aria-hidden="true" className="size-4" />
          {m.share_off()}
        </p>
      )}

      {unsupported ? (
        <p role="alert" className="text-destructive text-sm">
          {m.share_unsupported()}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ToggleGroup
            type="single"
            value={String(minutes)}
            aria-label={m.share_duration_label()}
            className="md:max-w-md"
            onValueChange={(value) => {
              const next = SHARE_DURATIONS_MIN.find((option) => String(option) === value)
              if (next) setMinutes(next)
            }}
          >
            {SHARE_DURATIONS_MIN.map((option) => (
              <ToggleGroupItem key={option} value={String(option)}>
                {m.share_duration_hours({ hours: option / MINUTES_PER_HOUR })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-11 rounded-full px-5"
              disabled={isChanging}
              onClick={() => onStart(minutes)}
            >
              {enabled ? m.share_extend() : m.share_start()}
            </Button>
            {enabled && (
              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                disabled={isChanging}
                onClick={onStop}
              >
                {m.share_stop()}
              </Button>
            )}
          </div>
        </div>
      )}

      {geoStatus === 'denied' && (
        <p role="alert" className="text-destructive text-sm">
          {m.share_denied()}
        </p>
      )}
      {geoStatus === 'unavailable' && (
        <p role="alert" className="text-destructive text-sm">
          {m.share_unavailable()}
        </p>
      )}
      {sendError && (
        <p role="alert" className="text-destructive text-sm">
          {m.share_send_failed()}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-destructive text-sm">
          {m.share_failed()}
        </p>
      )}
    </section>
  )
}
