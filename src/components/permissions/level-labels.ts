import type { Level } from '@/lib/permissions'
import { m } from '@/paraglide/messages'

export const LEVEL_LABELS: Record<Level, () => string> = {
  NONE: () => m.perm_level_none(),
  READ: () => m.perm_level_read(),
  WRITE: () => m.perm_level_write(),
}
