import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef } from 'react'
import { observeReveal } from '@/lib/motion'

interface RevealProps {
  children: ReactNode
  as?: ElementType
  className?: string
  /** Delay in ms, to stagger siblings. */
  delay?: number
  id?: string
}

/**
 * Fades its content in (and lifts it a little) when it scrolls into view. Under
 * prefers-reduced-motion it only fades. Never wrap the first screen's headline in it.
 */
export function Reveal({ children, as: Tag = 'div', className, delay = 0, id }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => (ref.current ? observeReveal(ref.current) : undefined), [])
  return (
    <Tag
      ref={ref}
      id={id}
      data-reveal=""
      className={className}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  )
}
