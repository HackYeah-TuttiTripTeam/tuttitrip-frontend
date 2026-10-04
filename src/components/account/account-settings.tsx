import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, Info } from '@keyline-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { canEditName, type Provider } from '@/lib/account'
import { m } from '@/paraglide/messages'

// Mirrors AccountUpdate on the API: a name of 1 to 100 characters, spaces trimmed.
export const accountNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => m.account_settings_name_required() })
    .max(100, { error: () => m.people_form_max_100() }),
})
export type AccountNameValues = z.infer<typeof accountNameSchema>

const PROVIDER_NAMES: Record<Provider, () => string> = {
  google: m.provider_google,
  discord: m.provider_discord,
  password: m.provider_password,
  other: m.provider_other,
}

interface AccountSettingsProps {
  name: string
  provider: Provider
  /** Saves the new name; the message is the API's failure in words. */
  onRename: (name: string) => Promise<{ ok: true } | { ok: false; message: string }>
}

/** The caller's display name, and where the account comes from. */
export function AccountSettings({ name, provider, onRename }: AccountSettingsProps) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const editable = canEditName(provider)
  const form = useForm<AccountNameValues>({
    resolver: zodResolver(accountNameSchema),
    defaultValues: { name },
  })
  const { errors, isSubmitting, isDirty } = form.formState

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section aria-labelledby="account-name-title" className="flex flex-col gap-4">
        <h2 id="account-name-title" className="font-medium text-lg">
          {m.account_settings_name_title()}
        </h2>
        {editable ? (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              setSaved(false)
              const result = await onRename(values.name)
              setError(result.ok ? null : result.message)
              if (result.ok) {
                setSaved(true)
                form.reset({ name: values.name })
              }
            })}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="account-name">{m.account_settings_name_label()}</FieldLabel>
                <Input
                  id="account-name"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  className="h-11 md:h-9"
                  {...form.register('name', { onChange: () => setSaved(false) })}
                />
                <FieldDescription>{m.account_settings_name_hint()}</FieldDescription>
                <FieldError errors={[errors.name]} />
              </Field>
            </FieldGroup>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            {saved && (
              <p role="status" className="flex items-center gap-2 text-sm">
                <CircleCheck aria-hidden="true" className="size-4 text-primary" />
                {m.account_settings_saved()}
              </p>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="h-11 w-full sm:h-9 sm:w-fit"
            >
              {isSubmitting ? m.action_working() : m.account_settings_save()}
            </Button>
          </form>
        ) : (
          <>
            <p className="font-medium text-base">{name}</p>
            <p className="flex items-start gap-2 text-muted-foreground text-sm leading-relaxed">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {m.account_settings_provider_managed({ provider: PROVIDER_NAMES[provider]() })}
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="account-provider-title" className="flex flex-col gap-2">
        <h2 id="account-provider-title" className="font-medium text-lg">
          {m.account_settings_login_title()}
        </h2>
        <p className="text-sm">
          {m.account_settings_provider_label()}{' '}
          <span className="font-medium">{PROVIDER_NAMES[provider]()}</span>
        </p>
        {provider === 'password' && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {m.account_settings_password_hint()}
          </p>
        )}
      </section>
    </div>
  )
}
