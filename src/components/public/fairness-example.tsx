import { useState } from 'react'
import { HelpHint } from '@/components/shared/help-hint'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

export interface ExamplePerson {
  name: string
  /** Part of what the person could get alone, 0 to 1 (the "r" of the fairness algorithm). */
  share: number
  /** Index into the member colours, 1 to 5. */
  tone: 1 | 2 | 3 | 4 | 5
}

const THUMB_TONE: Record<ExamplePerson['tone'], string> = {
  1: '[--thumb:var(--member-1)]',
  2: '[--thumb:var(--member-2)]',
  3: '[--thumb:var(--member-3)]',
  4: '[--thumb:var(--member-4)]',
  5: '[--thumb:var(--member-5)]',
}

interface FairnessExampleProps {
  people: ExamplePerson[]
  /** Share under which a plan gets a problem, 0 to 1. */
  floor: number
  formatShare: (share: number) => string
}

/**
 * The fairness chart with sample data, and the one thing on the landing page that answers a
 * finger or a mouse: each person's dot is a slider. One row per person, a dot at the share of
 * their own maximum, the area under the floor shaded. The headline is the lowest share in the
 * group, computed from the rows below it, so moving a dot changes it the way the real solver's
 * result would read. Sliders are native range inputs: keyboard, touch and screen readers work.
 */
export function FairnessExample({ people, floor, formatShare }: FairnessExampleProps) {
  const [shares, setShares] = useState(() => people.map((person) => person.share))
  const rows = people.map((person, index) => ({ ...person, share: shares[index] ?? person.share }))
  const moved = shares.some((share, index) => share !== people[index]?.share)

  const lowest = rows.reduce<ExamplePerson | undefined>(
    (min, person) => (min && min.share <= person.share ? min : person),
    undefined,
  )
  const nobodyBelowFloor = rows.every((person) => person.share >= floor)

  return (
    <figure
      id="fairness"
      className="flex scroll-mt-24 flex-col gap-5 rounded-lg border bg-card p-5 md:p-6"
    >
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
          <p className="mt-1 flex items-center gap-1 text-muted-foreground text-sm">
            {m.example_metric()}
            <HelpHint id="weakest" />
          </p>
        </div>
      )}

      <ul className="flex flex-col">
        {rows.map((person, index) => (
          <li
            key={person.name}
            className="grid grid-cols-[5.5rem_1fr_2.75rem] items-center gap-3 sm:grid-cols-[6.5rem_1fr_2.75rem]"
          >
            <span className="truncate text-sm">{person.name}</span>
            <span className="relative flex h-11 items-center">
              <span
                aria-hidden="true"
                className="route-x absolute inset-x-0 top-1/2 h-1 -translate-y-1/2"
              />
              <span
                aria-hidden="true"
                className="absolute inset-y-2 left-0 border-r-2 border-input border-dashed bg-muted"
                style={{ width: `${floor * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(person.share * 100)}
                aria-label={m.example_slider({ name: person.name })}
                aria-valuetext={formatShare(person.share)}
                onChange={(event) => {
                  const next = Number(event.target.value) / 100
                  setShares((current) => current.map((share, at) => (at === index ? next : share)))
                }}
                className={cn('tt-range relative', THUMB_TONE[person.tone])}
              />
            </span>
            <span className="text-right font-medium text-sm tabular-nums">
              {formatShare(person.share)}
            </span>
          </li>
        ))}
      </ul>

      <figcaption className="flex flex-col gap-1 text-sm" aria-live="polite">
        {nobodyBelowFloor && (
          <span className="w-fit rounded-full bg-want-soft px-3 py-1 font-medium text-want-ink">
            {m.example_badge()}
          </span>
        )}
        {lowest && (
          <span className="flex items-center gap-1">
            {m.example_summary({
              name: lowest.name,
              share: formatShare(lowest.share),
              floor: formatShare(floor),
            })}
            <HelpHint id="floor" />
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground">
          {m.example_explainer()}
          <HelpHint id="jain" />
        </span>
      </figcaption>

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t pt-3">
        <p className="flex items-center gap-1 text-muted-foreground text-sm">
          {m.example_hint()}
          <HelpHint id="alpha" />
        </p>
        {moved && (
          <button
            type="button"
            onClick={() => setShares(people.map((person) => person.share))}
            className="min-h-11 rounded-md px-1 font-medium text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {m.example_reset()}
          </button>
        )}
      </div>
    </figure>
  )
}
