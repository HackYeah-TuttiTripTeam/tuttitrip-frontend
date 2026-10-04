import { PROGRESS_DECIMALS } from '@/lib/constants'

// Framework-free helpers for the motion of the public pages. Each `observe*` / `track*`
// function returns its cleanup. With prefers-reduced-motion nothing moves: elements are
// shown at once and the progress jumps to its end (CSS keeps a plain opacity fade).

export const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(reducedMotionQuery).matches
}

/** Keeps a number inside 0..1. */
export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * How far a block has been travelled through the viewport: 0 when its top is at `start`
 * (a share of the viewport height from the top), 1 when its bottom is at `end`.
 */
export function scrollProgress(
  rect: { top: number; height: number },
  viewportHeight: number,
  start = 0.8,
  end = 0.45,
): number {
  const from = viewportHeight * start
  const to = viewportHeight * end - rect.height
  if (from === to) return 1
  return clamp01((from - rect.top) / (from - to))
}

let revealObserver: IntersectionObserver | undefined

/** One observer for every revealed element on the page. */
function sharedRevealObserver(): IntersectionObserver {
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        ;(entry.target as HTMLElement).dataset.reveal = 'in'
        revealObserver?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  )
  return revealObserver
}

/** Marks the element `data-reveal="in"` when it first comes into view (once). */
export function observeReveal(element: HTMLElement): () => void {
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    element.dataset.reveal = 'in'
    return () => undefined
  }
  const observer = sharedRevealObserver()
  observer.observe(element)
  return () => observer.unobserve(element)
}

/**
 * Writes the scroll progress of an element (0..1) into its `--progress` custom property while
 * it is on screen, and calls `onChange` with it. One passive scroll listener, one frame at most.
 */
export function trackScrollProgress(
  element: HTMLElement,
  onChange?: (progress: number) => void,
): () => void {
  const apply = (progress: number) => {
    element.style.setProperty('--progress', progress.toFixed(PROGRESS_DECIMALS))
    onChange?.(progress)
  }
  if (prefersReducedMotion()) {
    apply(1)
    return () => undefined
  }
  let frame = 0
  const update = () => {
    frame = 0
    apply(scrollProgress(element.getBoundingClientRect(), window.innerHeight))
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }
  update()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  return () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame) cancelAnimationFrame(frame)
  }
}

/** Calls `onChange(true)` once the page is scrolled past `offset` px, and back. */
export function trackScrolled(offset: number, onChange: (scrolled: boolean) => void): () => void {
  let last: boolean | undefined
  const update = () => {
    const scrolled = window.scrollY > offset
    if (scrolled !== last) {
      last = scrolled
      onChange(scrolled)
    }
  }
  update()
  window.addEventListener('scroll', update, { passive: true })
  return () => window.removeEventListener('scroll', update)
}
