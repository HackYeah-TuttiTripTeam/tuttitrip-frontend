import { externalLink } from '@/lib/external-link'
import { m } from '@/paraglide/messages'

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright'

/** The attribution the ODbL licence asks for wherever OpenStreetMap data is shown. */
export function OsmAttribution() {
  return (
    <p className="text-muted-foreground text-xs">
      <a
        href={OSM_COPYRIGHT_URL}
        {...externalLink}
        className="underline underline-offset-2 hover:text-foreground"
      >
        {m.places_osm_attribution()}
      </a>
    </p>
  )
}
