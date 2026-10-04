import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * True while the page is being printed or saved as PDF (`beforeprint` .. `afterprint`), so a
 * printout can be rendered only then and not sit next to the screen UI. The state is flushed
 * inside the event, because the browser lays the page out right after it. The printout is always
 * light: the app themes through the `.dark` class, taken off for the length of printing.
 */
export function usePrinting(): boolean {
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    let wasDark = false
    const before = () => {
      wasDark = root.classList.contains('dark')
      root.classList.remove('dark')
      flushSync(() => setPrinting(true))
    }
    const after = () => {
      if (wasDark) root.classList.add('dark')
      wasDark = false
      setPrinting(false)
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
      if (wasDark) root.classList.add('dark')
    }
  }, [])

  return printing
}
