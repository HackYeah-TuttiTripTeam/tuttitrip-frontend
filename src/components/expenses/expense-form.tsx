import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AMOUNT_LIMITS,
  CURRENCIES,
  EXPENSE_CATEGORIES,
  type ExpenseFormValues,
  expenseFormSchema,
  NO_CATEGORY,
  previewShares,
  SHARE_LIMITS,
  SPLIT_METHODS,
  splitIssue,
} from '@/lib/expense-form'
import { formatDecimal, formatDecimalNumber } from '@/lib/format'
import { centsToDecimal, compareDecimals } from '@/lib/money'
import { m } from '@/paraglide/messages'
import { CATEGORY_LABELS, METHOD_LABELS } from './category-labels'
import type { PersonOption } from './person-option'

interface ExpenseFormProps {
  people: PersonOption[]
  /** The trip's currency; null when it has none and the user picks one. */
  tripCurrency: string | null
  initial: ExpenseFormValues
  /** Server-side 422 messages, per field. */
  fieldErrors: Partial<Record<'amount' | 'payerId' | 'participants' | 'currency' | 'rate', string>>
  submitError: string | null
  isSubmitting: boolean
  submitLabel: string
  submittingLabel: string
  onSubmit: (values: ExpenseFormValues) => void
}

const UNIT: Record<'percent' | 'weights', () => string> = {
  percent: m.expense_unit_percent,
  weights: m.expense_unit_weights,
}

/**
 * Amount, date, payer, participants as switches (everybody by default) and the split method. The
 * per-person amounts under the switches use the backend's own allocation (lib/money.ts), so what
 * you see is what is saved, to the cent.
 */
export function ExpenseForm({
  people,
  tripCurrency,
  initial,
  fieldErrors,
  submitError,
  isSubmitting,
  submitLabel,
  submittingLabel,
  onSubmit,
}: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: initial,
  })
  const { errors } = form.formState

  useEffect(() => {
    if (fieldErrors.amount) form.setError('amount', { type: 'server', message: fieldErrors.amount })
    if (fieldErrors.payerId) {
      form.setError('payerId', { type: 'server', message: fieldErrors.payerId })
    }
  }, [fieldErrors.amount, fieldErrors.payerId, form.setError])

  const values = form.watch()
  const issue = splitIssue(values)
  const currency = tripCurrency ?? (values.currency || 'PLN')
  // The split alert waits for the first input, so a fresh form is not red.
  const showIssue = issue !== null && (form.formState.isDirty || form.formState.isSubmitted)
  const shares = previewShares(values)
  const splitting = values.method !== 'equal'
  const toggle = (id: string, on: boolean) =>
    form.setValue(
      'included',
      people
        .map((person) => person.id)
        .filter((candidate) => (candidate === id ? on : values.included.includes(candidate))),
      { shouldDirty: true },
    )

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(errors.amount)}>
          <FieldLabel htmlFor="expense-amount">{m.expense_form_amount({ currency })}</FieldLabel>
          <Input
            id="expense-amount"
            inputMode="decimal"
            maxLength={AMOUNT_LIMITS.whole + AMOUNT_LIMITS.fraction + 3}
            autoComplete="off"
            placeholder="0,00"
            aria-invalid={Boolean(errors.amount)}
            className="h-12 text-lg tabular-nums md:h-10"
            {...form.register('amount')}
          />
          <FieldError errors={[errors.amount]} />
        </Field>

        {tripCurrency === null && (
          <Field data-invalid={Boolean(fieldErrors.currency)}>
            <FieldLabel htmlFor="expense-currency">{m.expense_form_currency()}</FieldLabel>
            <Controller
              control={form.control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="expense-currency" className="h-11 w-full md:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>{m.expense_form_currency_hint()}</FieldDescription>
            {fieldErrors.currency && (
              <p role="alert" className="text-destructive text-sm">
                {fieldErrors.currency}
              </p>
            )}
          </Field>
        )}

        <Field data-invalid={Boolean(errors.payerId)}>
          <FieldLabel htmlFor="expense-payer">{m.expense_form_payer()}</FieldLabel>
          <Controller
            control={form.control}
            name="payerId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="expense-payer"
                  className="h-11 w-full md:h-9"
                  aria-invalid={Boolean(errors.payerId)}
                >
                  <SelectValue placeholder={m.expense_form_payer_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.payerId]} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(errors.spentOn)}>
            <FieldLabel htmlFor="expense-date">{m.expense_form_date()}</FieldLabel>
            <Input
              id="expense-date"
              type="date"
              aria-invalid={Boolean(errors.spentOn)}
              className="h-11 md:h-9"
              {...form.register('spentOn')}
            />
            <FieldError errors={[errors.spentOn]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="expense-category">{m.expense_form_category()}</FieldLabel>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value || NO_CATEGORY_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === NO_CATEGORY_VALUE ? NO_CATEGORY : value)
                  }
                >
                  <SelectTrigger id="expense-category" className="h-11 w-full md:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY_VALUE}>{m.expense_category_none()}</SelectItem>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {CATEGORY_LABELS[category]()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="expense-description">{m.expense_form_description()}</FieldLabel>
          <Input
            id="expense-description"
            autoComplete="off"
            placeholder={m.expense_form_description_placeholder()}
            aria-invalid={Boolean(errors.description)}
            className="h-11 md:h-9"
            {...form.register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <fieldset className="flex flex-col gap-3 border-t pt-4">
          <legend className="font-medium text-sm">{m.expense_form_split()}</legend>
          <Controller
            control={form.control}
            name="method"
            render={({ field }) => (
              <ToggleGroup
                type="single"
                value={field.value}
                aria-label={m.expense_form_method()}
                onValueChange={(value) => {
                  const next = SPLIT_METHODS.find((method) => method === value)
                  if (!next) return
                  field.onChange(next)
                  // Percents and weights mean different things: start the other kind clean.
                  form.setValue('values', {})
                }}
              >
                {SPLIT_METHODS.map((method) => (
                  <ToggleGroupItem key={method} value={method}>
                    {METHOD_LABELS[method]()}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />

          <ul className="flex flex-col">
            {people.map((person) => {
              const included = values.included.includes(person.id)
              const cents = shares.get(person.id)
              return (
                <li key={person.id} className="flex min-h-12 items-center gap-3 border-b py-1">
                  <Switch
                    checked={included}
                    onCheckedChange={(on) => toggle(person.id, on)}
                    aria-label={m.expense_form_participant({ name: person.name })}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{person.name}</span>
                  {included && splitting && (
                    <span className="flex items-center gap-1">
                      <Input
                        key={values.method}
                        inputMode="decimal"
                        autoComplete="off"
                        maxLength={SHARE_LIMITS.whole + SHARE_LIMITS.fraction + 2}
                        aria-label={m.expense_form_value({
                          name: person.name,
                          unit: UNIT[values.method === 'percent' ? 'percent' : 'weights'](),
                        })}
                        className="h-11 w-20 text-right tabular-nums md:h-9"
                        {...form.register(`values.${person.id}`)}
                      />
                      <span aria-hidden="true" className="w-4 text-muted-foreground text-sm">
                        {values.method === 'percent' ? '%' : '×'}
                      </span>
                    </span>
                  )}
                  <span className="w-24 text-right text-sm tabular-nums">
                    {included && cents !== undefined ? (
                      formatDecimal(centsToDecimal(cents), currency)
                    ) : (
                      <span className="text-muted-foreground">{m.expense_preview_none()}</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>

          <p
            role={showIssue ? 'alert' : 'status'}
            className={showIssue ? 'text-destructive text-sm' : 'text-muted-foreground text-sm'}
          >
            {showIssue && issue?.kind === 'nobody' && m.expense_error_nobody()}
            {showIssue && issue?.kind === 'value_missing' && m.expense_issue_value_missing()}
            {showIssue &&
              issue?.kind === 'percent_sum' &&
              (compareDecimals(issue.missing, '0') > 0
                ? m.expense_issue_percent_missing({ missing: formatDecimalNumber(issue.missing) })
                : m.expense_issue_percent_over({
                    over: formatDecimalNumber(issue.missing.replace('-', '')),
                  }))}
            {issue === null && values.method === 'percent' && m.expense_issue_percent_ok()}
          </p>
          {fieldErrors.participants && (
            <p role="alert" className="text-destructive text-sm">
              {fieldErrors.participants}
            </p>
          )}
        </fieldset>
      </FieldGroup>

      {(submitError ?? fieldErrors.rate) && (
        <p role="alert" className="text-destructive text-sm">
          {submitError ?? fieldErrors.rate}
        </p>
      )}

      <div className="sticky bottom-0 -mx-1 border-t bg-background px-1 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          disabled={isSubmitting || issue !== null}
          className="h-11 w-full md:h-9"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}

const NO_CATEGORY_VALUE = '__none__'
