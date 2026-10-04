import type { ParametersVersion } from '@/api/queries/planning-parameters'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface VersionHistoryProps {
  versions: ParametersVersion[]
  /** The number in force, marked in the list. */
  currentVersion: number
  /** Loads an older set into the form (nothing is stored until the administrator saves). */
  onLoad: ((version: ParametersVersion) => void) | undefined
}

/** Who stored which version and when; the built-in default (version 0) has no author. */
export function VersionHistory({ versions, currentVersion, onLoad }: VersionHistoryProps) {
  return (
    <ul className="flex flex-col divide-y border-y">
      {versions.map((version) => (
        <li
          key={version.version}
          className="flex flex-col gap-1 py-4 md:flex-row md:items-center md:justify-between md:gap-6"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-heading font-semibold text-lg tabular-nums">
                {m.planning_version({ version: version.version })}
              </span>
              {version.version === currentVersion && (
                <span className="text-primary text-sm">{m.planning_in_force()}</span>
              )}
            </p>
            <p className="text-muted-foreground text-sm">
              {version.created_at
                ? m.planning_stored_by({
                    who: version.created_by_sub ?? m.planning_unknown_author(),
                    when: `${formatDate(version.created_at)}, ${formatTime(version.created_at)}`,
                  })
                : m.planning_built_in()}
            </p>
            {version.note && <p className="text-sm">{version.note}</p>}
          </div>
          {onLoad && (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-fit rounded-full md:h-9"
              onClick={() => onLoad(version)}
            >
              {m.planning_load({ version: version.version })}
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
