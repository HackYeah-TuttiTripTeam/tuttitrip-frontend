import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { FeatureGrant, Role } from '@/api/queries/permissions'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  type FeatureRow,
  type Grants,
  grantsToMap,
  isLockedRole,
  mapToGrants,
  type RoleFormValues,
  roleFormSchema,
  withLevel,
} from '@/lib/permissions'
import { m } from '@/paraglide/messages'
import { GrantsEditor } from './grants-editor'

interface RoleFormProps {
  /** The role being edited, or null for a new one. */
  role: Role | null
  rows: FeatureRow[]
  /** Read-only access to the panel: show everything, change nothing. */
  readOnly: boolean
  isSaving: boolean
  /** The API's message (a 403 "more than you have", a 422), or null. */
  error: string | null
  onSave: (name: string, description: string, grants: FeatureGrant[]) => void
  onDelete: () => void
  onClose: () => void
}

/** One form for a new role and for editing one. `superadmin` opens read-only, without actions. */
export function RoleForm({
  role,
  rows,
  readOnly,
  isSaving,
  error,
  onSave,
  onDelete,
  onClose,
}: RoleFormProps) {
  const locked = role !== null && isLockedRole(role.name)
  const frozen = locked || readOnly
  const [grants, setGrants] = useState<Grants>(() => grantsToMap(role?.grants ?? []))
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '' },
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        onSave(values.name, values.description, mapToGrants(grants)),
      )}
      className="flex flex-col gap-5 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <FieldGroup className="gap-4">
        {role === null && (
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="role-name">{m.perm_role_name_label()}</FieldLabel>
            <Input
              id="role-name"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(errors.name)}
              className="h-11 font-mono md:h-9"
              {...form.register('name')}
            />
            <FieldDescription>{m.perm_role_name_hint()}</FieldDescription>
            <FieldError errors={[errors.name]} />
          </Field>
        )}
        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="role-description">{m.perm_role_text_label()}</FieldLabel>
          <Textarea
            id="role-description"
            rows={2}
            disabled={frozen}
            aria-invalid={Boolean(errors.description)}
            {...form.register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>

      <section className="flex flex-col gap-2">
        <h3 className="font-medium text-sm">{m.perm_grants_title()}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">{m.perm_grants_hint()}</p>
        <GrantsEditor
          rows={rows}
          grants={grants}
          disabled={frozen}
          onChange={(feature, level) => setGrants((current) => withLevel(current, feature, level))}
        />
      </section>

      {error && (
        <p role="alert" className="text-destructive text-sm leading-relaxed">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {!frozen && (
          <Button type="submit" disabled={isSaving} className="h-11 md:h-9">
            {isSaving ? m.perm_saving() : role === null ? m.perm_role_create() : m.perm_role_save()}
          </Button>
        )}
        {!frozen && role !== null && !role.is_system && (
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onDelete}
            className="h-11 text-destructive md:h-9"
          >
            {m.perm_role_delete()}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose} className="h-11 md:h-9">
          {m.perm_close()}
        </Button>
      </div>
    </form>
  )
}
