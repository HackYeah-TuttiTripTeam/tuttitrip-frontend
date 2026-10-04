import { CloudOff, MapPinOff, TriangleAlert } from '@keyline-icons/react'
import { lazy, Suspense } from 'react'
import { StatusMessage } from '@/components/shared/status-message'
import { LocationConsent } from '@/components/trips/location-consent'
import { LocationList } from '@/components/trips/location-list'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocationSharing, useLocations } from '@/hooks/use-locations'
import { useMapsSettings } from '@/hooks/use-maps-settings'
import { canLocate } from '@/lib/geolocation'
import { m } from '@/paraglide/messages'
import { useLocationStore } from '@/stores/location-store'

const LocationsMap = lazy(() =>
  import('@/components/trips/locations-map').then((module) => ({ default: module.LocationsMap })),
)

/** The Lokalizacje tab: your opt-in and the last positions of everyone who shares. */
export function TripLocationsView({ tripId }: { tripId: string }) {
  const maps = useMapsSettings()
  const sharing = useLocationSharing(tripId)
  const locations = useLocations(tripId)
  const geoStatus = useLocationStore((state) => state.status)

  const config = maps.config
  const offline = locations.problem === 'offline'

  return (
    <div className="flex flex-col gap-8">
      <LocationConsent
        enabled={sharing.enabled}
        resumable={sharing.resumable}
        until={sharing.until}
        isChanging={sharing.isChanging}
        geoStatus={geoStatus}
        failed={sharing.error !== null}
        sendError={sharing.sendError}
        unsupported={!canLocate()}
        onStart={(minutes) => void sharing.start(minutes)}
        onResume={() => void sharing.resume()}
        onStop={() => void sharing.stop().catch(() => undefined)}
      />

      <section aria-labelledby="positions-heading" className="flex flex-col gap-4">
        <h2 id="positions-heading" className="font-medium text-lg">
          {m.locations_title()}
        </h2>
        {locations.isPending ? (
          <Skeleton aria-hidden="true" className="h-64 w-full rounded-lg" />
        ) : locations.problem ? (
          <StatusMessage
            role="alert"
            icon={offline ? <CloudOff /> : <TriangleAlert />}
            title={offline ? m.trips_offline_title() : m.locations_load_failed_title()}
            action={
              <Button variant="outline" onClick={locations.refetch}>
                {m.action_retry()}
              </Button>
            }
          >
            {offline ? m.trips_offline_body() : m.trips_load_failed_body()}
          </StatusMessage>
        ) : locations.locations.length === 0 ? (
          <StatusMessage icon={<MapPinOff />} title={m.locations_empty_title()}>
            {m.locations_empty_body()}
          </StatusMessage>
        ) : (
          <>
            {config ? (
              <div className="h-[24rem] overflow-hidden rounded-lg border md:h-[32rem]">
                <Suspense fallback={<Skeleton aria-hidden="true" className="size-full" />}>
                  <LocationsMap
                    locations={locations.locations}
                    apiKey={config.apiKey}
                    mapId={config.mapId}
                    language={maps.language}
                    colorScheme={maps.colorScheme}
                  />
                </Suspense>
              </div>
            ) : (
              <p role="status" className="text-muted-foreground text-sm">
                {m.plan_map_unavailable()}
              </p>
            )}
            <LocationList locations={locations.locations} />
          </>
        )}
      </section>
    </div>
  )
}
