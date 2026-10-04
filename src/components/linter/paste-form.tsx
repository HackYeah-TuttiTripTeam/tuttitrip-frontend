import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface PasteFormProps {
  text: string
  onTextChange: (text: string) => void
  /** The API's limit; a longer text is refused there, so the button waits here. */
  maxChars: number
  isSubmitting: boolean
  /** Why the last send failed, in words. */
  error: string | null
  onSubmit: () => void
}

/** A plan copied from a chatbot, with a live count against the API's limit. */
export function PasteForm({
  text,
  onTextChange,
  maxChars,
  isSubmitting,
  error,
  onSubmit,
}: PasteFormProps) {
  const tooLong = text.length > maxChars
  const empty = text.trim().length === 0
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!tooLong && !empty) onSubmit()
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field data-invalid={tooLong}>
        <FieldLabel htmlFor="lint-paste">{m.lint_paste_label()}</FieldLabel>
        <Textarea
          id="lint-paste"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={m.lint_paste_placeholder()}
          aria-invalid={tooLong}
          aria-describedby="lint-paste-count"
          className="min-h-48 max-h-[50dvh]"
        />
        <FieldDescription id="lint-paste-count">
          {m.lint_paste_count({
            count: formatNumber(text.length),
            max: formatNumber(maxChars),
          })}
        </FieldDescription>
        {tooLong && (
          <FieldError>{m.lint_paste_too_long({ max: formatNumber(maxChars) })}</FieldError>
        )}
      </Field>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 border-t bg-background pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          disabled={isSubmitting || tooLong || empty}
          className="h-11 w-full md:h-9"
        >
          {isSubmitting ? m.lint_paste_sending() : m.lint_paste_submit()}
        </Button>
      </div>
    </form>
  )
}
