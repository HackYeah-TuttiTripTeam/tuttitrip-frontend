import { UserPlus, Users } from '@keyline-icons/react'
import { useState } from 'react'
import type { Profile } from '@/api/queries/profiles'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { type EditValues, hasAccount, type Person, type SaveResult } from '@/lib/people'
import { m } from '@/paraglide/messages'
import { AddPersonForm, type AddPersonValues, EditPersonForm } from './person-form'
import { PersonRow } from './person-row'

interface FamilyBuilderProps {
  people: Person[]
  /** Host and co-host: add, edit and remove. Members get the list only. */
  canManage: boolean
  isDesktop: boolean
  onAdd: (values: AddPersonValues) => Promise<SaveResult>
  onEdit: (profile: Profile, values: EditValues) => Promise<SaveResult>
  onRemove: (profile: Profile) => Promise<SaveResult>
}

type Dialog = { kind: 'add' } | { kind: 'edit'; id: string } | null

/** The people of a trip with age-based defaults; also the family card of the interview. */
export function FamilyBuilder({
  people,
  canManage,
  isDesktop,
  onAdd,
  onEdit,
  onRemove,
}: FamilyBuilderProps) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)
  const editing =
    dialog?.kind === 'edit' ? people.find((p) => p.profile.id === dialog.id) : undefined

  const addButton = (
    <Button onClick={() => setDialog({ kind: 'add' })} className="h-11 md:h-9">
      <UserPlus aria-hidden="true" />
      {m.people_add()}
    </Button>
  )

  return (
    <section aria-labelledby="people-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 id="people-heading" className="font-medium text-lg">
            {m.trip_people_title()}
          </h2>
          <p className="text-muted-foreground text-sm">
            {m.people_count({ count: people.length })}
          </p>
        </div>
        {canManage && people.length > 0 && addButton}
      </div>

      {people.length === 0 ? (
        <StatusMessage
          icon={<Users />}
          title={m.people_empty_title()}
          action={canManage ? addButton : undefined}
        >
          {canManage ? m.people_empty_body_manage() : m.people_empty_body_member()}
        </StatusMessage>
      ) : (
        <ul aria-label={m.people_list_label()} className="flex flex-col divide-y border-y">
          {people.map((person) => (
            <li key={person.profile.id}>
              <PersonRow
                person={person}
                onEdit={
                  canManage && !hasAccount(person)
                    ? () => setDialog({ kind: 'edit', id: person.profile.id })
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      <ResponsiveModal
        open={dialog?.kind === 'add'}
        onOpenChange={(open) => !open && close()}
        isDesktop={isDesktop}
        title={m.people_form_add_title()}
        description={m.people_form_add_description()}
      >
        <AddPersonForm
          onSubmit={async (values) => {
            const result = await onAdd(values)
            if (result.ok) close()
            return result
          }}
        />
      </ResponsiveModal>

      <ResponsiveModal
        open={editing !== undefined}
        onOpenChange={(open) => !open && close()}
        isDesktop={isDesktop}
        title={m.people_form_edit_title({ name: editing?.profile.display_name ?? '' })}
        description={m.people_form_edit_description()}
      >
        {editing && (
          <EditPersonForm
            key={editing.profile.id}
            profile={editing.profile}
            onSubmit={async (values) => {
              const result = await onEdit(editing.profile, values)
              if (result.ok) close()
              return result
            }}
            onDelete={async () => {
              const result = await onRemove(editing.profile)
              if (result.ok) close()
              return result
            }}
          />
        )}
      </ResponsiveModal>
    </section>
  )
}

export function FamilyBuilderSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
