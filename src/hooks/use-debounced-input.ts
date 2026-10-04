import { useEffect, useRef, useState } from 'react'

/**
 * A text box whose value reaches `onCommit` (the URL) only after the typing stops, so the history
 * does not fill up. A `value` that changes from outside (back button, "clear filters") replaces
 * the draft; a commit this hook made itself does not.
 */
export function useDebouncedInput(value: string, onCommit: (next: string) => void, delay = 300) {
  const [draft, setDraft] = useState(value)
  const committed = useRef(value)
  const commit = useRef(onCommit)
  commit.current = onCommit

  useEffect(() => {
    if (value === committed.current) return
    committed.current = value
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (draft === committed.current) return
    const timer = setTimeout(() => {
      committed.current = draft
      commit.current(draft)
    }, delay)
    return () => clearTimeout(timer)
  }, [draft, delay])

  const clear = () => {
    setDraft('')
    if (committed.current === '') return
    committed.current = ''
    commit.current('')
  }

  return { draft, setDraft, clear }
}
