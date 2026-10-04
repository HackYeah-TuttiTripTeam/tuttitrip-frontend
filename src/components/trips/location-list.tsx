import type { MemberLocation } from '@/api/queries/locations'
import { formatAgo } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** The same positions as text: who shares and when the position was sent (also without a map). */
export function LocationList({ locations }: { locations: MemberLocation[] }) {
  return (
    <ul aria-label={m.locations_list_label()} className="flex flex-col divide-y border-t">
      {locations.map((location) => (
        <li key={location.profile_id} className="flex items-baseline justify-between gap-3 py-3">
          <span className="truncate font-medium">
            {location.display_name}
            {location.is_me && (
              <span className="ml-2 font-normal text-muted-foreground text-sm">
                {m.checkin_me()}
              </span>
            )}
          </span>
          <span className="shrink-0 text-muted-foreground text-sm">
            {m.locations_updated({ ago: formatAgo(location.recorded_at) })}
          </span>
        </li>
      ))}
    </ul>
  )
}
