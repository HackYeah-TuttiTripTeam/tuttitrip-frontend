import { Info } from '@keyline-icons/react'
import type { Assumption } from '@/api/queries/proposals'
import { formatDate } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** The assumption in the UI's own wording (the API's `text` is Polish only); `params` fill the gaps. */
function assumptionText({ code, params, text }: Assumption): string {
  const start = params?.start_date
  const adults = params?.adults
  switch (code) {
    case 'dates':
      return typeof start === 'string'
        ? m.plan_draft_assumption_dates({ date: formatDate(start) })
        : text
    case 'people':
      return typeof adults === 'number' ? m.plan_draft_assumption_people({ count: adults }) : text
    case 'budget':
      return m.plan_draft_assumption_budget()
    case 'preferences':
      return m.plan_draft_assumption_preferences()
  }
}

interface DraftBannerProps {
  /** What the build assumed; null when only the plan is known (after a reload the API does not repeat it). */
  assumptions: Assumption[] | null
}

/** Marks a plan built from incomplete data as preliminary, with the assumptions behind it. */
export function DraftBanner({ assumptions }: DraftBannerProps) {
  return (
    <section
      aria-labelledby="plan-draft-title"
      className="flex flex-col gap-2 rounded-lg border border-primary/40 p-4 text-sm"
    >
      <h2 id="plan-draft-title" className="flex items-center gap-2 font-medium">
        <Info aria-hidden="true" className="size-4 shrink-0" />
        {m.plan_draft_title()}
      </h2>
      <p className="text-muted-foreground leading-relaxed">{m.plan_draft_body()}</p>
      {assumptions && assumptions.length > 0 && (
        <>
          <p className="font-medium">{m.plan_draft_assumptions()}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
            {assumptions.map((assumption) => (
              <li key={assumption.code}>{assumptionText(assumption)}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
