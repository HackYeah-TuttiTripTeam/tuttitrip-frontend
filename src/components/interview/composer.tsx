import { SendHorizontal } from '@keyline-icons/react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MESSAGE_MAX_CHARS } from '@/lib/interview-constants'
import { m } from '@/paraglide/messages'

interface ComposerProps {
  disabled: boolean
  onSend: (text: string) => void
  /** Extra controls next to the field, e.g. the phone's "What I know" button. */
  children?: ReactNode
}

/** The line under the conversation: typing is an add-on, the cards are the main way to answer. */
export function Composer({ disabled, onSend, children }: ComposerProps) {
  const [text, setText] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim() || disabled) return
    onSend(text)
    setText('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        aria-label={m.interview_composer_label()}
        placeholder={m.interview_composer_placeholder()}
        className="h-11 flex-1 rounded-full px-4"
        maxLength={MESSAGE_MAX_CHARS}
        autoComplete="off"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Button
        type="submit"
        size="icon"
        className="size-11 shrink-0 rounded-full"
        disabled={disabled || !text.trim()}
        aria-label={m.interview_send()}
      >
        <SendHorizontal aria-hidden="true" />
      </Button>
      {children}
    </form>
  )
}
