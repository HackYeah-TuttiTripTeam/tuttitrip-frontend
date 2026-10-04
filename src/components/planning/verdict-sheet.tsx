import type { ExplainEntry, PlanVerdict } from '@/api/queries/plans'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { REASON_LABELS, skipLabel, VERDICT_MEANINGS } from '@/lib/verdicts'
import { m } from '@/paraglide/messages'
import { VerdictChip } from './verdict-chip'

interface VerdictSheetProps {
  /** The verdict to show; null keeps the sheet closed. */
  verdict: PlanVerdict | null
  placeName: string
  isDesktop: boolean
  /** Display name by profile id. */
  names: ReadonlyMap<string, string>
  /** The E1 numbers per person; empty for a place that is not in the plan. */
  explain: ExplainEntry[]
  /** Name of the replacement, when the API proposes one. */
  substituteName: string | null
  /** The place is in the plan (so the host can block it); otherwise the host can force it in. */
  inPlan: boolean
  /** Only the host can force or block a place. */
  canOverride: boolean
  onClose: () => void
  onOverride: (placeId: string, kind: 'must' | 'block') => void
  /** Jumps to the place in the day tabs; offered when the place is in the plan. */
  onShowOnPlan: (placeId: string) => void
}

/** Who is for, who is against and why, the numbers behind it, and what to take instead. */
export function VerdictSheet({
  verdict,
  placeName,
  isDesktop,
  names,
  explain,
  substituteName,
  inPlan,
  canOverride,
  onClose,
  onOverride,
  onShowOnPlan,
}: VerdictSheetProps) {
  const nameOf = (profileId: string) => names.get(profileId) ?? m.verdict_someone()
  const noVotes = verdict != null && !verdict.yes?.length && !verdict.no?.length

  return (
    <ResponsiveModal
      open={verdict !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      isDesktop={isDesktop}
      title={placeName}
      description={verdict ? VERDICT_MEANINGS[verdict.verdict]() : ''}
    >
      {verdict && (
        <div className="flex flex-col gap-5 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <VerdictChip verdict={verdict.verdict} />
            {inPlan && (
              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                onClick={() => onShowOnPlan(verdict.place_id)}
              >
                {m.verdict_show_on_plan()}
              </Button>
            )}
          </div>

          {noVotes ? (
            <p className="text-muted-foreground text-sm leading-relaxed">{m.verdict_no_votes()}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Side
                title={m.verdict_yes()}
                empty={m.verdict_yes_empty()}
                people={(verdict.yes ?? []).map((vote) => ({
                  id: vote.profile_id,
                  name: nameOf(vote.profile_id),
                  reason: vote.reason_code ? REASON_LABELS[vote.reason_code]() : null,
                }))}
              />
              <Side
                title={m.verdict_no()}
                empty={m.verdict_no_empty()}
                people={(verdict.no ?? []).map((vote) => ({
                  id: vote.profile_id,
                  name: nameOf(vote.profile_id),
                  reason: vote.reason_code ? REASON_LABELS[vote.reason_code]() : null,
                }))}
              />
            </div>
          )}

          {(verdict.skip_codes?.length ?? 0) > 0 && (
            <section>
              <h3 className="font-medium text-sm">{m.verdict_skip_why()}</h3>
              <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed">
                {verdict.skip_codes?.map((code) => (
                  <li key={code}>{skipLabel(code)}</li>
                ))}
              </ul>
            </section>
          )}

          {explain.length > 0 && (
            <section>
              <h3 className="font-medium text-sm">{m.verdict_numbers_title()}</h3>
              <table className="mt-1 w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground text-xs">
                    <th scope="col" className="py-1 font-normal">
                      {m.verdict_numbers_person()}
                    </th>
                    <th scope="col" className="py-1 text-right font-normal">
                      {m.verdict_numbers_match()}
                    </th>
                    <th scope="col" className="py-1 text-right font-normal">
                      {m.verdict_numbers_effort()}
                    </th>
                    <th scope="col" className="py-1 text-right font-normal">
                      {m.verdict_numbers_utility()}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {explain.map((entry) => (
                    <tr key={entry.profile_id}>
                      <th scope="row" className="py-1.5 text-left font-normal">
                        {nameOf(entry.profile_id)}
                      </th>
                      <td className="py-1.5 text-right font-mono tabular-nums">
                        {formatNumber(entry.match)}
                      </td>
                      <td className="py-1.5 text-right font-mono tabular-nums">
                        {formatNumber(entry.effort)}
                      </td>
                      <td className="py-1.5 text-right font-mono tabular-nums">
                        {formatNumber(entry.utility)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-muted-foreground text-xs">{m.verdict_numbers_hint()}</p>
            </section>
          )}

          {verdict.substitute_place_id && substituteName && (
            <section className="rounded-lg border p-4">
              <h3 className="font-medium text-sm">{m.verdict_instead()}</h3>
              <p className="mt-1 text-sm">{substituteName}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {canOverride && (
                  <Button
                    variant="outline"
                    className="h-11 rounded-full px-5"
                    onClick={() =>
                      verdict.substitute_place_id && onOverride(verdict.substitute_place_id, 'must')
                    }
                  >
                    {m.verdict_force_instead()}
                  </Button>
                )}
              </div>
            </section>
          )}

          {canOverride && (
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
              <Button
                variant={inPlan ? 'outline' : 'default'}
                className="h-11 rounded-full px-5"
                onClick={() => onOverride(verdict.place_id, inPlan ? 'block' : 'must')}
              >
                {inPlan ? m.verdict_block() : m.verdict_force()}
              </Button>
              <p className="self-center text-muted-foreground text-xs leading-relaxed">
                {m.verdict_override_hint()}
              </p>
            </div>
          )}
        </div>
      )}
    </ResponsiveModal>
  )
}

interface SideProps {
  title: string
  empty: string
  people: { id: string; name: string; reason: string | null }[]
}

function Side({ title, empty, people }: SideProps) {
  return (
    <section>
      <h3 className="font-medium text-sm">{title}</h3>
      {people.length === 0 ? (
        <p className="mt-1 text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="mt-1 divide-y">
          {people.map((person) => (
            <li key={person.id} className="py-1.5 text-sm">
              <span className="font-medium">{person.name}</span>
              {person.reason && (
                <span className="block text-muted-foreground">{person.reason}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
