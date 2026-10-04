import { Pen } from '@keyline-icons/react'
import { HelpHint } from '@/components/shared/help-hint'
import { Button } from '@/components/ui/button'
import { formatNumber, formatTime, lowerCase } from '@/lib/format'
import {
  COMFORT_FIELDS,
  type ComfortField,
  GROUP_LABELS,
  hasAccount,
  type Person,
  shortTime,
} from '@/lib/people'
import { m } from '@/paraglide/messages'
import { PersonAvatar } from './person-avatar'

export const ROLE_LABELS = {
  host: m.trip_role_host,
  co_host: m.trip_role_co_host,
  member: m.trip_role_member,
} as const

/** Names the API puts in `customized_fields`, as the label of the value the host corrected. */
const FIELD_LABELS: Record<ComfortField, () => string> = {
  segment_km: m.people_walk_label,
  daily_km: m.people_walk_label,
  active_min: m.people_active_label,
  nap_start: m.people_nap_label,
  nap_minutes: m.people_nap_label,
  stairs_sensitivity: m.people_stairs_label,
  queue_patience_min: m.people_queue_label,
  floor: m.people_floor_label,
}

function customizedLabels(fields: string[]): string {
  const known = COMFORT_FIELDS.filter((field) => fields.includes(field))
  return [...new Set(known.map((field) => lowerCase(FIELD_LABELS[field]())))].join(', ')
}

interface PersonRowProps {
  person: Person
  /** Opens the edit form; omitted for people the caller cannot edit (members, accounts). */
  onEdit?: () => void
  /** Opens the person's preferences: constraints, diet and interests. */
  onOpen: () => void
}

/** One person: who, how old, and every comfort value the planner will use. */
export function PersonRow({ person, onEdit, onOpen }: PersonRowProps) {
  const { profile, role } = person
  const customized = customizedLabels(profile.customized_fields)
  const tag = role ? ROLE_LABELS[role]() : hasAccount(person) ? null : m.people_profile_only()
  const nap =
    profile.nap_start && profile.nap_minutes > 0
      ? m.people_nap_value({
          time: formatTime(`2000-01-01T${shortTime(profile.nap_start)}:00`),
          minutes: profile.nap_minutes,
        })
      : m.people_nap_none()

  return (
    <div className="flex items-start gap-3 py-4">
      <PersonAvatar id={profile.id} name={profile.display_name} hasAccount={hasAccount(person)} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="truncate font-medium text-base">{profile.display_name}</span>
          <span className="text-muted-foreground text-sm">
            {m.people_age({ age: profile.age })}, {GROUP_LABELS[profile.age_group]()}
          </span>
          {tag && (
            <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
              {tag}
              <HelpHint id={role ? 'role' : 'status'} />
            </span>
          )}
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-muted-foreground">{m.people_walk_label()}</dt>
          <dd>
            {m.people_walk_value({
              segment: formatNumber(profile.segment_km, 1),
              daily: formatNumber(profile.daily_km, 1),
            })}
          </dd>
          <dt className="text-muted-foreground">{m.people_active_label()}</dt>
          <dd>{m.people_active_value({ hours: formatNumber(profile.active_min / 60, 1) })}</dd>
          <dt className="text-muted-foreground">{m.people_nap_label()}</dt>
          <dd>{nap}</dd>
          <dt className="text-muted-foreground">{m.people_stairs_label()}</dt>
          <dd>{m.people_stairs_value({ value: formatNumber(profile.stairs_sensitivity, 2) })}</dd>
          <dt className="text-muted-foreground">{m.people_queue_label()}</dt>
          <dd>{m.people_queue_value({ minutes: profile.queue_patience_min })}</dd>
          <dt className="flex items-center gap-1 text-muted-foreground">
            {m.people_floor_label()}
            <HelpHint id="floor" />
          </dt>
          <dd>{m.people_floor_value({ value: formatNumber(profile.floor, 0) })}</dd>
        </dl>
        {/* Dashed = an estimate from the age; solid = the host's own correction. */}
        <span
          className={`w-fit rounded-full border px-2.5 py-0.5 text-xs ${customized ? 'border-solid text-foreground' : 'border-dashed text-muted-foreground'}`}
        >
          {customized ? m.people_source_changed({ fields: customized }) : m.people_source_default()}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={onOpen}
          aria-label={m.prefs_open_label({ name: profile.display_name })}
          className="h-11 w-fit md:h-9"
        >
          {m.prefs_open()}
        </Button>
      </div>
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={m.people_edit_label({ name: profile.display_name })}
          className="-my-1 size-11 shrink-0 rounded-full text-muted-foreground"
        >
          <Pen aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
