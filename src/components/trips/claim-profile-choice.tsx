import type { ClaimableProfile } from '@/api/queries/invitations'
import { GROUP_LABELS } from '@/components/profiles/person-row'
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
      <FieldLegend>{m.join_claim_legend()}</FieldLegend>
      <p className="text-muted-foreground text-sm">{m.join_claim_hint()}</p>
      <RadioGroup value={value} onValueChange={onChange} className="gap-2">
        {profiles.map((profile) => (
          <Option
            key={profile.profile_id}
            value={profile.profile_id}
            label={m.join_claim_option({
              name: profile.display_name,
              group: GROUP_LABELS[profile.age_group]().toLowerCase(),
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
