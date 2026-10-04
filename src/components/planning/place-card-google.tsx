import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapsProvider } from '@/components/shared/maps-provider'
import { Skeleton } from '@/components/ui/skeleton'

interface PlaceCardGoogleProps {
  /** Google Place ID from our catalogue. */
  placeId: string
  apiKey: string
  language: string
  colorScheme: 'LIGHT' | 'DARK'
}

/**
 * The Google Places UI Kit card of a place: photos, rating, opening status and the required
 * attribution. It is display only: nothing is read from it into our state, the API or the
 * planner (EEA terms). The query is made when this mounts, so mount it on a tap, never in a list.
 */
export function PlaceCardGoogle({ placeId, apiKey, language, colorScheme }: PlaceCardGoogleProps) {
  return (
    <MapsProvider apiKey={apiKey} language={language}>
      <PlaceDetails placeId={placeId} colorScheme={colorScheme} />
    </MapsProvider>
  )
}

function PlaceDetails({
  placeId,
  colorScheme,
}: Pick<PlaceCardGoogleProps, 'placeId' | 'colorScheme'>) {
  // The element is defined by the places library; until it loads the tag would render empty.
  const places = useMapsLibrary('places')
  if (!places) return <Skeleton aria-hidden="true" className="h-64 w-full rounded-md" />
  return (
    <gmp-place-details-compact
      orientation="VERTICAL"
      style={{ colorScheme: colorScheme === 'DARK' ? 'dark' : 'light', width: '100%' }}
    >
      <gmp-place-details-place-request place={placeId} />
      <gmp-place-content-config>
        <gmp-place-media lightbox-preferred />
        <gmp-place-address />
        <gmp-place-rating />
        <gmp-place-type />
        <gmp-place-open-now-status />
        <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white" />
      </gmp-place-content-config>
    </gmp-place-details-compact>
  )
}
