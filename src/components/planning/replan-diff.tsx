import { ArrowRight, Clock, Minus, Plus } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import type { ReplanChange } from '@/api/queries/replan'
import { formatClock } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** The words of one change: what it was, what it is, and by how much it moved. */
function ChangeLine({ change }: { change: ReplanChange }): ReactNode {
  const start = change.start ? formatClock(change.start) : null
  switch (change.kind) {
    case 'replaced':
      return (
        <span className="flex flex-wrap items-center gap-x-1.5">
          <span className="text-muted-foreground line-through">{change.was_name}</span>
          <ArrowRight aria-label={m.replan_instead_of()} className="size-4 shrink-0" />
          <span className="font-medium">{change.name}</span>
          {start && <span className="tabular-nums">{start}</span>}
        </span>
      )
    case 'moved':
      return (
        <span className="flex flex-wrap items-center gap-x-1.5">
          <Clock aria-hidden="true" className="size-4 shrink-0" />
          <span className="font-medium">{change.name}</span>
          <span className="tabular-nums">
            {change.was_start && start
              ? m.replan_moved({
                  from: formatClock(change.was_start),
                  to: start,
                  minutes: Math.abs(change.shift_minutes),
                })
              : start}
          </span>
        </span>
      )
    case 'removed':
      return (
        <span className="flex items-center gap-1.5">
          <Minus aria-hidden="true" className="size-4 shrink-0" />
          <span className="text-muted-foreground line-through">{change.name}</span>
          <span>{m.replan_removed()}</span>
        </span>
      )
    case 'added':
      return (
        <span className="flex items-center gap-1.5">
          <Plus aria-hidden="true" className="size-4 shrink-0" />
          <span className="font-medium">{change.name}</span>
          {start && <span className="tabular-nums">{start}</span>}
          <span>{m.replan_added()}</span>
        </span>
      )
  }
}

interface ReplanDiffProps {
  changes: ReplanChange[]
}

/** "Was" and "is" for the changed stops, with the people each change touches. */
export function ReplanDiff({ changes }: ReplanDiffProps) {
  if (changes.length === 0) {
    return <p className="text-muted-foreground text-sm">{m.replan_no_changes()}</p>
  }
  return (
    <ul className="flex flex-col">
      {changes.map((change) => (
        <li
          key={`${change.kind}-${change.name}-${change.was_name ?? ''}`}
          className="flex flex-col gap-0.5 border-b py-2 text-sm"
        >
          <ChangeLine change={change} />
          {change.person_names.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {m.replan_affects({ names: change.person_names.join(', ') })}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
