import type { Access } from '@/api/queries/permissions'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  type Feature,
  type FeatureRow,
  type Grants,
  inheritedLevel,
  LEVELS,
  type Level,
} from '@/lib/permissions'
import { m } from '@/paraglide/messages'
import { LEVEL_LABELS } from './level-labels'

interface GrantsEditorProps {
  rows: FeatureRow[]
  grants: Grants
  onChange: (feature: Feature, level: Level) => void
  disabled?: boolean
}

const isLevel = (value: string): value is Level => LEVELS.some((level) => level === value)

/**
 * The feature tree with one level picker per node. A grant covers the node's subtree, so a node
 * without its own grant shows where its level comes from.
 */
export function GrantsEditor({ rows, grants, onChange, disabled = false }: GrantsEditorProps) {
  return (
    <ul aria-label={m.perm_grants_label()} className="flex flex-col divide-y rounded-lg border">
      {rows.map((row) => {
        const own: Access | undefined = grants.get(row.code)
        const inherited = own ? null : inheritedLevel(row, grants)
        return (
          <li
            key={row.code}
            className="flex flex-col gap-2 py-2 pr-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            style={{ paddingLeft: `${0.75 + row.depth * 0.9}rem` }}
          >
            <div className="min-w-0">
              <p className="truncate font-medium font-mono text-sm">{row.code}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{row.description}</p>
              {inherited && (
                <p className="text-muted-foreground text-xs">
                  {m.perm_inherited({
                    feature: inherited.from,
                    level: LEVEL_LABELS[inherited.level](),
                  })}
                </p>
              )}
            </div>
            <ToggleGroup
              type="single"
              value={own ?? 'NONE'}
              disabled={disabled}
              aria-label={m.perm_level_for({ feature: row.code })}
              onValueChange={(value) => {
                // Pressing the chosen segment again reports '': keep the level.
                if (isLevel(value)) onChange(row.code, value)
              }}
              className="shrink-0 sm:w-64"
            >
              {LEVELS.map((level) => (
                <ToggleGroupItem
                  key={level}
                  value={level}
                  aria-label={`${row.code}: ${LEVEL_LABELS[level]()}`}
                >
                  {LEVEL_LABELS[level]()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </li>
        )
      })}
    </ul>
  )
}
