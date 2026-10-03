import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

export interface ExamplePerson {
  name: string
  score: number
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
  /** Score under which a plan gets a problem, in points. */
  floor: number
  /** Formatted headline figure, e.g. "0,87". */
  metric: string
  formatScore: (score: number) => string
}

/**
 * Static illustration of the fairness chart with sample data: one row per person,
 * a dot at their score, the area under the floor shaded. Says so in a caption.
 */
export function FairnessExample({ people, floor, metric, formatScore }: FairnessExampleProps) {
  const lowest = people.reduce<ExamplePerson | undefined>(
    (min, person) => (min && min.score <= person.score ? min : person),
    undefined,
  )

  return (
    <figure className="flex flex-col gap-5 rounded-lg border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <p className="font-medium text-muted-foreground text-sm">{m.example_label()}</p>
          <p className="font-heading font-extrabold text-5xl tabular-nums leading-none tracking-tight">
            {metric}
          </p>
        </div>
        <p className="rounded-full bg-want-soft px-3 py-1 font-medium text-sm text-want-ink">
          {m.example_badge()}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {people.map((person) => (
          <li
            key={person.name}
            className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 sm:grid-cols-[6.5rem_1fr_2rem]"
          >
            <span className="truncate text-sm">{person.name}</span>
            <span aria-hidden="true" className="relative flex h-5 items-center">
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span
                className="absolute inset-y-0 left-0 border-r border-dashed bg-muted"
                style={{ width: `${floor}%` }}
              />
              <span
                className={cn(
                  'absolute size-4 -translate-x-1/2 rounded-full ring-2 ring-card',
                  DOT_TONE[person.tone],
                )}
                style={{ left: `${person.score}%` }}
              />
            </span>
            <span className="text-right font-medium text-sm tabular-nums">
              {formatScore(person.score)}
            </span>
          </li>
        ))}
      </ul>

      <figcaption className="flex flex-col gap-1 text-sm">
        {lowest && (
          <span>
            {m.example_summary({
              name: lowest.name,
              score: formatScore(lowest.score),
              floor: formatScore(floor),
            })}
          </span>
        )}
        <span className="text-muted-foreground">{m.example_note()}</span>
      </figcaption>
    </figure>
  )
}
