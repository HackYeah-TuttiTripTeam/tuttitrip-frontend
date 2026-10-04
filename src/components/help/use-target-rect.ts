import { useEffect, useState } from 'react'
import { findTourTarget, TOUR_TALL_TARGET } from '@/lib/help'

export interface TargetBox {
  rect: DOMRect
  /** The target's centre is in the lower half of the viewport: keep the panel in the upper one. */
  low: boolean
}

/**
 * Viewport box of the element with this `data-tour` value, scrolled into view and kept current
 * while it moves or resizes. Undefined when there is no target or it is too tall to ring.
 * Shared positioning primitive: the guided tour uses it, and so can anything else anchored to a
 * `data-tour` element.
 */
export function useTargetBox(name: string | undefined): TargetBox | undefined {
  const [box, setBox] = useState<TargetBox>()
  useEffect(() => {
    const element = name ? findTourTarget(name) : null
    if (!element) {
      setBox(undefined)
      return
    }
    const tall = () =>
      element.getBoundingClientRect().height > window.innerHeight * TOUR_TALL_TARGET
    element.scrollIntoView?.({ block: tall() ? 'start' : 'nearest', behavior: 'instant' })
    const measure = () => {
      const rect = element.getBoundingClientRect()
      setBox(
        tall() ? undefined : { rect, low: rect.top + rect.height / 2 > window.innerHeight / 2 },
      )
    }
    measure()
    // Content that finishes loading moves and resizes the target under the open dialog.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    observer?.observe(document.body)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [name])
  return box
}
