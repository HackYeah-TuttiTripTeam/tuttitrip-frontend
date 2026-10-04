import type { ClaimableProfile } from '@/api/queries/invitations'
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { lowerCase } from '@/lib/format'
import { GROUP_LABELS } from '@/lib/people'
import { m } from '@/paraglide/messages'

/** The value of "none of these"; profile ids are UUIDs, so it cannot clash. */
export const CLAIM_NEW = 'new'

interface ClaimProfileChoiceProps {
  profiles: ClaimableProfile[]
  /** A profile id, CLAIM_NEW, or '' while nothing is chosen. */
  value: string
  onChange: (value: string) => void
}

/** "Which of these is you?": the trip's people without an account, plus "none of these". */
export function ClaimProfileChoice({ profiles, value, onChange }: ClaimProfileChoiceProps) {
  return (
    <FieldSet>
      <FieldLegend id="join-claim-legend">{m.join_claim_legend()}</FieldLegend>
      <p id="join-claim-hint" className="text-muted-foreground text-sm">
        {m.join_claim_hint()}
      </p>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        aria-labelledby="join-claim-legend"
        aria-describedby="join-claim-hint"
        className="gap-2"
      >
        {profiles.map((profile) => (
          <Option
            key={profile.profile_id}
            value={profile.profile_id}
            label={m.join_claim_option({
              name: profile.display_name,
              group: lowerCase(GROUP_LABELS[profile.age_group]()),
            })}
          />
        ))}
        <Option value={CLAIM_NEW} label={m.join_claim_new()} />
      </RadioGroup>
    </FieldSet>
  )
}

function Option({ value, label }: { value: string; label: string }) {
  const id = `join-claim-${value}`
  return (
    <Field orientation="horizontal" className="min-h-11 items-center rounded-md border px-3">
      <RadioGroupItem id={id} value={value} />
      <FieldLabel htmlFor={id} className="flex-1 cursor-pointer py-2 font-normal">
        {label}
      </FieldLabel>
    </Field>
  )
}
