import { AdvancedMarker, Map as GoogleMap, Polyline } from '@vis.gl/react-google-maps'
import type { PlanStop } from '@/api/queries/plans'
import { FitPoints } from '@/components/shared/map-fit'
import { MapsProvider } from '@/components/shared/maps-provider'
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  ROUTE_STROKE_OPACITY,
  ROUTE_STROKE_WEIGHT,
} from '@/lib/map-constants'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

export interface PlanMapProps {
  /** The stops of one day, in plan order; the marker numbers follow this order. */
  stops: PlanStop[]
  selectedPlaceId: string | null
  onSelectStop: (placeId: string) => void
  apiKey: string
  mapId: string
  language: string
  colorScheme: 'LIGHT' | 'DARK'
  /** Line colour as rgb(), resolved from the primary token (Google takes no oklch). */
  routeColor: string
}

/**
 * One day on a Google map: numbered markers in plan order, a line through them and a view that
 * fits all of them. Only our own data is drawn (coordinates and names from the catalogue), never
 * anything from Places. Imported lazily by the plan view (`lazy()`), so the Google loader is fetched only when a map shows.
 */
export function PlanMap({
  stops,
  selectedPlaceId,
  onSelectStop,
  apiKey,
  mapId,
  language,
  colorScheme,
  routeColor,
}: PlanMapProps) {
  const points = stops.map((stop) => ({ lat: stop.lat, lng: stop.lon }))
  return (
    <MapsProvider apiKey={apiKey} language={language}>
      <GoogleMap
        mapId={mapId}
        colorScheme={colorScheme}
        reuseMaps
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        defaultCenter={MAP_DEFAULT_CENTER}
        defaultZoom={MAP_DEFAULT_ZOOM}
        className="size-full"
      >
        <FitPoints points={points} fitKey={stops.map((stop) => stop.place_id).join()} />
        <Polyline
          path={points}
          strokeColor={routeColor}
          strokeOpacity={ROUTE_STROKE_OPACITY}
          strokeWeight={ROUTE_STROKE_WEIGHT}
        />
        {stops.map((stop, index) => {
          const selected = stop.place_id === selectedPlaceId
          return (
            <AdvancedMarker
              key={stop.place_id}
              position={{ lat: stop.lat, lng: stop.lon }}
              title={m.plan_map_marker({ n: index + 1, name: stop.name })}
              zIndex={selected ? 1 : 0}
              onClick={() => onSelectStop(stop.place_id)}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 border-background font-semibold text-sm tabular-nums shadow-md transition-transform',
                  selected
                    ? 'scale-125 bg-foreground text-background'
                    : 'bg-primary text-primary-foreground',
                )}
              >
                {index + 1}
              </span>
            </AdvancedMarker>
          )
        })}
      </GoogleMap>
    </MapsProvider>
  )
}
