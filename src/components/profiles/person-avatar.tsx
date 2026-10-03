/** The six person colours of the design system; the profile id picks one, so it never shifts. */
const AVATAR_COLORS = [
  'bg-member-1',
  'bg-member-2',
  'bg-member-3',
  'bg-member-4',
  'bg-member-5',
  'bg-member-6',
] as const

function avatarColor(id: string): string {
  let sum = 0
  for (const char of id) sum += char.charCodeAt(0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}

const initials = (name: string) => name.trim().slice(0, 2).toLocaleUpperCase()

interface PersonAvatarProps {
  id: string
  name: string
  /** People without an account get a ring, as in the design system. */
  hasAccount: boolean
}

export function PersonAvatar({ id, name, hasAccount }: PersonAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-10 shrink-0 items-center justify-center rounded-full font-heading font-semibold text-on-member text-sm ${avatarColor(id)} ${hasAccount ? '' : 'outline-2 outline-offset-2 outline-muted-foreground/60'}`}
    >
      {initials(name)}
    </span>
  )
}
