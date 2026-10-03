import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

export interface ExamplePerson {
  name: string
  /** Part of what the person could get alone, 0 to 1 (the "r" of the fairness algorithm). */
  share: number
  /** Index into the member colours, 1 to 5. */
  tone: 1 | 2 | 3 | 4 | 5
}

const DOT_TONE: Record<ExamplePerson['tone'], string> = {
  1: 'bg-member-1',
  2: 'bg-member-2',
  3: 'bg-member-3',
  4: 'bg-member-4',
  5: 'bg-member-5',
}

interface FairnessExampleProps {
  people: ExamplePerson[]
  /** Share under which a plan gets a problem, 0 to 1. */
  floor: number
  formatShare: (share: number) => string
}

/**
 * Static illustration of the fairness chart with sample data: one row per person, a dot at
 * the share of their own maximum, the area under the floor shaded. The headline is the
 * lowest share in the group, computed from the rows below it.
 */
export function FairnessExample({ people, floor, formatShare }: FairnessExampleProps) {
  const lowest = people.reduce<ExamplePerson | undefined>(
    (min, person) => (min && min.share <= person.share ? min : person),
    undefined,
  )
  const nobodyBelowFloor = people.every((person) => person.share >= floor)

  return (
    <figure className="flex flex-col gap-5 rounded-lg border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p className="font-medium text-muted-foreground text-sm">{m.example_label()}</p>
        <p className="rounded-full border border-dashed px-3 py-1 font-medium text-sm">
          {m.example_note()}
        </p>
      </div>

      {lowest && (
        <div>
          <p className="font-heading font-extrabold text-5xl tabular-nums leading-none tracking-tight">
            {formatShare(lowest.share)}
          </p>
          <p className="mt-1 text-muted-foreground text-sm">{m.example_metric()}</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {people.map((person) => (
          <li
            key={person.name}
            className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 sm:grid-cols-[6.5rem_1fr_2.5rem]"
          >
            <span className="truncate text-sm">{person.name}</span>
            <span aria-hidden="true" className="relative flex h-5 items-center">
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span
                className="absolute inset-y-0 left-0 border-r-2 border-input border-dashed bg-muted"
                style={{ width: `${floor * 100}%` }}
              />
              <span
                className={cn(
                  'absolute size-4 -translate-x-1/2 rounded-full ring-2 ring-card',
                  DOT_TONE[person.tone],
                )}
                style={{ left: `${person.share * 100}%` }}
              />
            </span>
            <span className="text-right font-medium text-sm tabular-nums">
              {formatShare(person.share)}
            </span>
          </li>
        ))}
      </ul>

      <figcaption className="flex flex-col gap-1 text-sm">
        {nobodyBelowFloor && (
          <span className="w-fit rounded-full bg-want-soft px-3 py-1 font-medium text-want-ink">
            {m.example_badge()}
          </span>
        )}
        {lowest && (
          <span>
            {m.example_summary({
              name: lowest.name,
              share: formatShare(lowest.share),
              floor: formatShare(floor),
            })}
          </span>
        )}
        <span className="text-muted-foreground">{m.example_explainer()}</span>
      </figcaption>
    </figure>
  )
}
