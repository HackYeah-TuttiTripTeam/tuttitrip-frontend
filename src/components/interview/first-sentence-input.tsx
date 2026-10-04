import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MESSAGE_MAX_CHARS, SEND_SHORTCUT_KEY } from '@/lib/interview-constants'
import { m } from '@/paraglide/messages'

interface FirstSentenceInputProps {
  disabled: boolean
  onSubmit: (text: string) => void
}

/** The start of the interview: one big field and an example sentence the host can take over. */
export function FirstSentenceInput({ disabled, onSubmit }: FirstSentenceInputProps) {
  const [text, setText] = useState('')
  const example = m.interview_first_example()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (text.trim()) onSubmit(text)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="first-sentence" className="font-medium text-lg leading-snug">
        {m.interview_first_label()}
      </label>
      <Textarea
        id="first-sentence"
        value={text}
        disabled={disabled}
        maxLength={MESSAGE_MAX_CHARS}
        placeholder={example}
        aria-describedby="first-sentence-hint"
        className="min-h-28 text-base"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === SEND_SHORTCUT_KEY && (event.metaKey || event.ctrlKey)) submit(event)
        }}
      />
      <p id="first-sentence-hint" className="text-muted-foreground text-sm">
        {m.interview_first_hint()}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          className="h-11 rounded-full px-6"
          disabled={disabled || !text.trim()}
        >
          {m.interview_first_submit()}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-full"
          disabled={disabled}
          onClick={() => setText(example)}
        >
          {example}
        </Button>
      </div>
    </form>
  )
}
