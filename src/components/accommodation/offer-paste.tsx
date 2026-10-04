import { zodResolver } from '@hookform/resolvers/zod'
import { type Ref, useImperativeHandle, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { OFFER_TEXT_MAX_CHARS } from '@/lib/accommodation'
import { formatDate, formatNumber } from '@/lib/format'
import { type OfferFormValues, offerFormSchema } from '@/lib/offer-form'
import { m } from '@/paraglide/messages'

/** What the parent can do with the form: send the reader's attention to the text field. */
export interface OfferPasteHandle {
  focus: () => void
}

interface OfferPasteProps {
  /** Check-in dates of the trip's nights. */
  nights: string[]
  isSubmitting: boolean
  /** A message when the paste or the check could not be sent. */
  error: string | null
  onSubmit: (values: OfferFormValues) => void
  handle?: Ref<OfferPasteHandle>
}

/** Paste an offer (and its link), say which nights it is for, and send it to be checked. */
export function OfferPaste({ nights, isSubmitting, error, onSubmit, handle }: OfferPasteProps) {
  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: { text: '', url: '', nights },
  })
  const { errors } = form.formState
  const textRef = useRef<HTMLTextAreaElement | null>(null)
  useImperativeHandle(handle, () => ({ focus: () => textRef.current?.focus() }), [])
  const { ref: registerTextRef, ...text } = form.register('text')
  const length = form.watch('text').length

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(errors.text)}>
          <FieldLabel htmlFor="offer-text">{m.offer_text_label()}</FieldLabel>
          <Textarea
            id="offer-text"
            rows={6}
            maxLength={OFFER_TEXT_MAX_CHARS}
            placeholder={m.offer_text_placeholder()}
            aria-invalid={Boolean(errors.text)}
            {...text}
            ref={(element) => {
              registerTextRef(element)
              textRef.current = element
            }}
          />
          <FieldDescription>
            {m.offer_text_hint({
              count: formatNumber(length, 0),
              max: formatNumber(OFFER_TEXT_MAX_CHARS, 0),
            })}
          </FieldDescription>
          <FieldError errors={[errors.text]} />
        </Field>

        <Field data-invalid={Boolean(errors.url)}>
          <FieldLabel htmlFor="offer-url">{m.offer_url_label()}</FieldLabel>
          <Input
            id="offer-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={m.offer_url_placeholder()}
            aria-invalid={Boolean(errors.url)}
            className="h-11 md:h-9"
            {...form.register('url')}
          />
          <FieldDescription>{m.offer_url_hint()}</FieldDescription>
          <FieldError errors={[errors.url]} />
        </Field>

        <Field data-invalid={Boolean(errors.nights)}>
          <FieldLabel id="offer-nights-label">{m.offer_nights_label()}</FieldLabel>
          <Controller
            control={form.control}
            name="nights"
            render={({ field }) => (
              <ToggleGroup
                type="multiple"
                value={field.value}
                aria-labelledby="offer-nights-label"
                className="flex flex-wrap rounded-2xl"
                onValueChange={field.onChange}
              >
                {nights.map((night) => (
                  <ToggleGroupItem key={night} value={night} className="px-4">
                    {formatDate(`${night}T12:00:00`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
          <FieldError errors={[errors.nights]} />
        </Field>
      </FieldGroup>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 self-start rounded-full px-6" disabled={isSubmitting}>
        {isSubmitting ? m.offer_checking() : m.offer_check()}
      </Button>
    </form>
  )
}
