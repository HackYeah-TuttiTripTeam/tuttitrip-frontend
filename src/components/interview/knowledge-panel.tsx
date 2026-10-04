import { Pen } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { budgetSummary, formatDateRange } from '@/lib/format'
import { type Knowledge, sourceOf } from '@/lib/interview'
import { m } from '@/paraglide/messages'

interface KnowledgePanelProps {
  knowledge: Knowledge | undefined
  isPending: boolean
  failed: boolean
  /** The assistant is writing: edits wait until it has answered. */
  locked: boolean
  onRetry: () => void
  onEditTrip: () => void
  /** Only people without an account can be corrected here, like in the Osoby tab. */
  onEditPerson: (profileId: string) => void
  onOpenPreferences: (profileId: string) => void
}

function SourceMark({ source }: { source: 'assistant' | 'host' | undefined }) {
  if (!source) return null
  return (
    <span className="rounded-full border px-2 py-0.5 text-muted-foreground text-xs">
      {source === 'host' ? m.interview_source_host() : m.interview_source_assistant()}
    </span>
  )
}

interface RowProps {
  label: string
  value: ReactNode
  source?: 'assistant' | 'host' | undefined
  editLabel?: string
  disabled?: boolean
  onEdit?: () => void
}

function Row({ label, value, source, editLabel, disabled, onEdit }: RowProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="text-sm">{value}</dd>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SourceMark source={source} />
        {onEdit && (
          <Button
            variant="ghost"
            className="size-11"
            disabled={disabled}
            aria-label={editLabel}
            onClick={onEdit}
          >
            <Pen aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}

const notSet = () => <span className="text-muted-foreground">{m.interview_panel_not_set()}</span>

function missingLabel(knowledge: Knowledge, entry: Knowledge['missing'][number]): string {
  switch (entry.field) {
    case 'destination':
      return m.interview_missing_destination()
    case 'dates':
      return m.interview_missing_dates()
    case 'budget':
      return m.interview_missing_budget()
    case 'people':
      return m.interview_missing_people()
    case 'preferences': {
      const name = knowledge.people.find((p) => p.id === entry.profile_id)?.display_name
      return m.interview_missing_preferences({ name: name ?? m.interview_person_unnamed() })
    }
  }
}

/**
 * "What I know so far": what the assistant has worked out, readable at a glance and correctable.
 * Each value says who set it, and a value the host changed is marked "corrected".
 */
export function KnowledgePanel({
  knowledge,
  isPending,
  failed,
  locked,
  onRetry,
  onEditTrip,
  onEditPerson,
  onOpenPreferences,
}: KnowledgePanelProps) {
  if (isPending) return <Skeleton aria-hidden="true" className="h-64 w-full rounded-lg" />

  if (failed || !knowledge) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p className="text-muted-foreground">{m.interview_panel_load_failed()}</p>
        <Button variant="outline" className="h-11" onClick={onRetry}>
          {m.action_retry()}
        </Button>
      </div>
    )
  }

  const { trip, people, preferences, missing } = knowledge
  const dates = formatDateRange(trip.start_date, trip.end_date)
  const budget = budgetSummary(trip)
  const empty = knowledge.sources.length === 0 && people.length === 0

  if (empty) {
    return (
      <StatusMessage icon={<Pen />} title={m.interview_panel_title()}>
        {m.interview_panel_empty()}
      </StatusMessage>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {locked && (
        <p role="status" className="text-muted-foreground text-xs">
          {m.interview_panel_locked()}
        </p>
      )}

      <section aria-labelledby="knowledge-trip" className="flex flex-col gap-1">
        <h3 id="knowledge-trip" className="font-medium text-sm">
          {m.interview_panel_trip()}
        </h3>
        <dl className="divide-y">
          <Row
            label={m.interview_panel_destination()}
            value={trip.destination ?? notSet()}
            source={sourceOf(knowledge, 'destination')}
            editLabel={m.interview_panel_edit({ field: m.interview_panel_destination() })}
            disabled={locked}
            onEdit={onEditTrip}
          />
          <Row
            label={m.interview_panel_dates()}
            value={dates ?? notSet()}
            source={sourceOf(knowledge, 'dates')}
            editLabel={m.interview_panel_edit({ field: m.interview_panel_dates() })}
            disabled={locked}
            onEdit={onEditTrip}
          />
          <Row
            label={m.interview_panel_budget()}
            value={budget ?? notSet()}
            source={sourceOf(knowledge, 'budget')}
            editLabel={m.interview_panel_edit({ field: m.interview_panel_budget() })}
            disabled={locked}
            onEdit={onEditTrip}
          />
        </dl>
      </section>

      <section aria-labelledby="knowledge-people" className="flex flex-col gap-1">
        <h3 id="knowledge-people" className="font-medium text-sm">
          {m.interview_panel_people()}
        </h3>
        {people.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.interview_panel_not_set()}</p>
        ) : (
          <ul className="divide-y">
            {people.map((person) => (
              <li key={person.id}>
                <dl>
                  <Row
                    label={person.display_name}
                    value={m.interview_panel_age({ age: person.age })}
                    source={sourceOf(knowledge, 'people', person.id)}
                    editLabel={m.interview_panel_edit({ field: person.display_name })}
                    disabled={locked}
                    onEdit={person.user_sub === null ? () => onEditPerson(person.id) : undefined}
                  />
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="knowledge-prefs" className="flex flex-col gap-1">
        <h3 id="knowledge-prefs" className="font-medium text-sm">
          {m.interview_panel_preferences()}
        </h3>
        <ul className="divide-y">
          {people.map((person) => {
            const filled = preferences.find((p) => p.profile_id === person.id)?.filled ?? false
            return (
              <li key={person.id}>
                <dl>
                  <Row
                    label={person.display_name}
                    value={filled ? m.interview_panel_filled() : m.interview_panel_todo()}
                    source={sourceOf(knowledge, 'preferences', person.id)}
                    editLabel={m.interview_panel_open_person({ name: person.display_name })}
                    onEdit={() => onOpenPreferences(person.id)}
                  />
                </dl>
              </li>
            )
          })}
        </ul>
      </section>

      {missing.length > 0 && (
        <section aria-labelledby="knowledge-missing" className="flex flex-col gap-2">
          <h3 id="knowledge-missing" className="font-medium text-sm">
            {m.interview_panel_missing()}
          </h3>
          <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
            {missing.map((entry) => (
              <li key={`${entry.field}:${entry.profile_id ?? ''}`}>
                {missingLabel(knowledge, entry)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
