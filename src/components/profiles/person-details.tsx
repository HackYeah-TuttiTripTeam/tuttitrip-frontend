import { ArrowLeft } from '@keyline-icons/react'
import type { Diet, Preferences } from '@/api/queries/preferences'
import { Button } from '@/components/ui/button'
import { GROUP_LABELS, hasAccount, type Person, type SaveResult } from '@/lib/people'
import type { ConstraintsValues } from '@/lib/preferences'
import { m } from '@/paraglide/messages'
import { ConstraintsForm, ConstraintsSummary } from './constraints-form'
import { DietPicker } from './diet-picker'
import { InterestsPicker } from './interests-picker'
import { PersonAvatar } from './person-avatar'
import { ROLE_LABELS } from './person-row'

interface PersonDetailsProps {
  person: Person
  preferences: Preferences
  /** The person themselves, or a host or co-host. Everyone else reads. */
  canEdit: boolean
  onBack: () => void
  onSaveConstraints: (values: ConstraintsValues) => Promise<SaveResult>
  onSetDiet: (change: (diet: Diet) => Diet) => Promise<SaveResult>
  onSetInterests: (
    change: (interests: Preferences['interests']) => Preferences['interests'],
  ) => Promise<SaveResult>
}

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t pt-6">
      <div className="flex flex-col">
        <h3 id={id} className="font-medium text-lg">
          {title}
        </h3>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/**
 * One person's preferences: constraints, diet and interests. New sections of the profile (the
 * importance pool, liked and disliked places) are more `Section`s below the interests.
 */
export function PersonDetails({
  person,
  preferences,
  canEdit,
  onBack,
  onSaveConstraints,
  onSetDiet,
  onSetInterests,
}: PersonDetailsProps) {
  const { profile, role } = person
  const tag = role ? ROLE_LABELS[role]() : hasAccount(person) ? null : m.people_profile_only()
  const { constraints } = preferences

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="-ms-3 h-11 w-fit text-muted-foreground"
        >
          <ArrowLeft aria-hidden="true" />
          {m.prefs_back()}
        </Button>
        <div className="flex items-center gap-3">
          <PersonAvatar
            id={profile.id}
            name={profile.display_name}
            hasAccount={hasAccount(person)}
          />
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate font-heading font-semibold text-xl">{profile.display_name}</h2>
            <p className="text-muted-foreground text-sm">
              {m.people_age({ age: profile.age })}, {GROUP_LABELS[profile.age_group]()}
              {tag && `, ${tag}`}
            </p>
          </div>
        </div>
        {!canEdit && (
          <p role="note" className="rounded-lg border border-dashed px-4 py-3 text-sm">
            {m.prefs_readonly_note()}
          </p>
        )}
        {!preferences.filled && (
          <p className="text-muted-foreground text-sm">
            {canEdit ? m.prefs_not_filled() : m.prefs_not_filled_readonly()}
          </p>
        )}
      </div>

      <Section
        id="prefs-constraints"
        title={m.prefs_constraints_title()}
        hint={m.prefs_constraints_hint()}
      >
        {canEdit && constraints ? (
          <ConstraintsForm
            profile={profile}
            constraints={constraints}
            onSubmit={onSaveConstraints}
          />
        ) : (
          <ConstraintsSummary profile={profile} constraints={constraints} />
        )}
      </Section>

      <Section
        id="prefs-diet"
        title={m.prefs_diet_title()}
        hint={canEdit ? m.prefs_autosave() : undefined}
      >
        <DietPicker diet={preferences.diet} onChange={onSetDiet} readOnly={!canEdit} />
      </Section>

      <Section
        id="prefs-interests"
        title={m.prefs_interests_title()}
        hint={
          canEdit ? `${m.prefs_interests_hint()} ${m.prefs_autosave()}` : m.prefs_interests_hint()
        }
      >
        <InterestsPicker
          interests={preferences.interests}
          onChange={onSetInterests}
          readOnly={!canEdit}
        />
      </Section>
    </div>
  )
}
