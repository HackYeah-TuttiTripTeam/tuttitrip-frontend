import type { ReactNode } from 'react'

interface StatusMessageProps {
  icon: ReactNode
  title: string
  children: ReactNode
  action?: ReactNode
  /** "alert" for errors so screen readers announce them. */
  role?: 'status' | 'alert'
}

/** Empty, error and sign-in states: one message, one way forward. */
export function StatusMessage({
  icon,
  title,
  children,
  action,
  role = 'status',
}: StatusMessageProps) {
  return (
    <div
      role={role}
      className="flex flex-col items-start gap-3 border-t py-10 md:items-center md:py-16 md:text-center"
    >
      <span className="text-muted-foreground [&_svg]:size-6">{icon}</span>
      <h2 className="font-medium text-base">{title}</h2>
      <div className="max-w-md text-muted-foreground text-sm leading-relaxed">{children}</div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
