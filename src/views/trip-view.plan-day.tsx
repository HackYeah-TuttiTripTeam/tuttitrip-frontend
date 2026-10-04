import { MapPin } from '@keyline-icons/react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { PlanDay, PlanStop } from '@/api/queries/plans'
import { PlaceCardDialog } from '@/components/planning/place-card-dialog'
import { PlanTimeline, stopDomId } from '@/components/planning/plan-timeline'
import { type PlanPane, PlanViewSwitch } from '@/components/planning/plan-view-switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMapsSettings } from '@/hooks/use-maps-settings'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { tokenColor } from '@/lib/css-color'
import { ROUTE_FALLBACK_COLOR } from '@/lib/map-constants'
import { m } from '@/paraglide/messages'

// The map pulls in the Google Maps loader; it is fetched only when a map is about to show.
const PlanMap = lazy(() =>
  import('@/components/planning/plan-map').then((module) => ({ default: module.PlanMap })),
)

interface PlanDayPanelProps {
  day: PlanDay
  currency: string
  view: PlanPane
  onViewChange: (view: PlanPane) => void
}

/**
 * One day of the plan: the timeline and, when the Google key is set, the map of the same stops
 * (side by side on desktop, a Lista | Mapa switch on phones). Without the key the list stays and
 * a note says the map is unavailable. The place card opens only on a tap.
 */
export function PlanDayPanel({ day, currency, view, onViewChange }: PlanDayPanelProps) {
  const maps = useMapsSettings()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [selected, setSelected] = useState<string | null>(null)
  const [card, setCard] = useState<PlanStop | null>(null)

  const config = maps.config
  // Read from the theme's CSS variable, so it follows light and dark; a canvas read is not free.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the colour scheme is what changes the token's value
  const routeColor = useMemo(
    () => tokenColor('--primary', ROUTE_FALLBACK_COLOR),
    [maps.colorScheme],
  )
  const showMap = config !== null && (isDesktop || view === 'map')
  const showList = config === null || isDesktop || view === 'list'

  useEffect(() => {
    if (selected && showList) {
      document
        .getElementById(stopDomId(selected))
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    }
  }, [selected, showList])

  const selectStop = (placeId: string) => {
    setSelected(placeId)
    // On a phone the list is behind the switch: go to it, so the picked stop is the one in view.
    if (!isDesktop) onViewChange('list')
  }

  return (
    <div className="flex flex-col gap-4">
      {config ? (
        <PlanViewSwitch value={view} onChange={onViewChange} />
      ) : (
        <p role="status" className="text-muted-foreground text-sm">
          {m.plan_map_unavailable()}
        </p>
      )}
      <div className={config ? 'grid gap-6 md:grid-cols-2 md:items-start' : undefined}>
        {showList && (
          <PlanTimeline
            stops={day.items}
            currency={currency}
            selectedPlaceId={selected}
            renderActions={(stop) =>
              config && stop.google_place_id ? (
                <Button
                  variant="outline"
                  className="h-11 w-fit rounded-full px-4"
                  onClick={() => setCard(stop)}
                >
                  <MapPin aria-hidden="true" />
                  {m.place_card_open()}
                  <span className="sr-only"> {stop.name}</span>
                </Button>
              ) : null
            }
          />
        )}
        {config && showMap && (
          <div className="h-[24rem] overflow-hidden rounded-lg border md:sticky md:top-4 md:h-[32rem]">
            <Suspense fallback={<Skeleton aria-hidden="true" className="size-full" />}>
              <PlanMap
                stops={day.items}
                selectedPlaceId={selected}
                onSelectStop={selectStop}
                apiKey={config.apiKey}
                mapId={config.mapId}
                language={maps.language}
                colorScheme={maps.colorScheme}
                routeColor={routeColor}
              />
            </Suspense>
          </div>
        )}
      </div>
      {config && (
        <PlaceCardDialog
          stop={card}
          isDesktop={isDesktop}
          apiKey={config.apiKey}
          language={maps.language}
          colorScheme={maps.colorScheme}
          onClose={() => setCard(null)}
        />
      )}
    </div>
  )
}
