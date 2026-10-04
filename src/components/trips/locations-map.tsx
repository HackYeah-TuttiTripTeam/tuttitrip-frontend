import { AdvancedMarker, Map as GoogleMap } from '@vis.gl/react-google-maps'
import type { MemberLocation } from '@/api/queries/locations'
import { FitPoints } from '@/components/shared/map-fit'
import { MapsProvider } from '@/components/shared/maps-provider'
import { formatAgo } from '@/lib/format'
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/lib/map-constants'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

interface LocationsMapProps {
  locations: MemberLocation[]
  apiKey: string
  mapId: string
  language: string
  colorScheme: 'LIGHT' | 'DARK'
}

/**
 * The last positions members share: a pill per person with the name and how long ago the position
 * was sent. The map is fitted once per set of people, never on a refresh of the same people, and a
 * refresh only moves the markers: the map is not loaded again (it counts against the free quota).
 */
export function LocationsMap({
  locations,
  apiKey,
  mapId,
  language,
  colorScheme,
}: LocationsMapProps) {
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
        <FitPoints
          points={locations.map((location) => ({
            lat: location.latitude,
            lng: location.longitude,
          }))}
          fitKey={locations.map((location) => location.profile_id).join()}
        />
        {locations.map((location) => (
          <AdvancedMarker
            key={location.profile_id}
            position={{ lat: location.latitude, lng: location.longitude }}
            title={m.locations_marker({
              name: location.display_name,
              ago: formatAgo(location.recorded_at),
            })}
          >
            <span
              className={cn(
                'flex flex-col items-center rounded-lg border-2 border-background px-2 py-1 text-center shadow-md',
                location.is_me
                  ? 'bg-foreground text-background'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              <span className="font-semibold text-sm leading-4">{location.display_name}</span>
              <span className="text-xs leading-4 opacity-90">
                {formatAgo(location.recorded_at)}
              </span>
            </span>
          </AdvancedMarker>
        ))}
      </GoogleMap>
    </MapsProvider>
  )
}
