import { CircleAlert, CircleCheck } from '@keyline-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { m } from '@/paraglide/messages'

interface CounterProps {
  title: string
  /** Null while it is still counted. */
  count: number | null | undefined
  /** Shown instead of a number when there is nothing to count. */
  missing?: string
}

/** A count with its state in words and an icon: color alone never says "clean" or "violations". */
function Counter({ title, count, missing }: CounterProps) {
  const clean = count === 0
  const Icon = clean ? CircleCheck : CircleAlert
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-md border p-4">
      <p className="text-muted-foreground text-sm">{title}</p>
      {count == null ? (
        missing ? (
          <p className="text-muted-foreground text-sm">{missing}</p>
        ) : (
          <Skeleton aria-hidden="true" className="h-10 w-16" />
        )
      ) : (
        <>
          <p className="font-heading font-semibold text-4xl tabular-nums leading-none">{count}</p>
          <p
            className={`flex items-center gap-1 text-sm ${clean ? 'text-want-ink' : 'text-danger-ink'}`}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {clean ? m.lint_state_clean() : m.lint_state_violations({ count })}
          </p>
        </>
      )}
    </div>
  )
}

interface LintCompareProps {
  /** Violations in the pasted plan; null while the chatbot's plan is read. */
  pasted: number | null
  /** Violations in the trip's own plan; undefined while counted, null when there is no plan. */
  ours: number | null | undefined
}

/** The jury's number: the chatbot's plan next to the TuttiTrip one. */
export function LintCompare({ pasted, ours }: LintCompareProps) {
  return (
    <section aria-labelledby="lint-compare" className="flex flex-col gap-2">
      <h2 id="lint-compare" className="sr-only">
        {m.lint_compare_title()}
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Counter title={m.lint_compare_pasted()} count={pasted} />
        <Counter
          title={m.lint_compare_ours()}
          count={ours}
          {...(ours === null ? { missing: m.lint_compare_no_plan() } : {})}
        />
      </div>
    </section>
  )
}
