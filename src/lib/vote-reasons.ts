import type { ReasonCode } from '@/api/vote-contract'
import { m } from '@/paraglide/messages'

/** The reasons for "I don't want it", in the order they are offered (the codes of the API). */
export const REASON_CODES = [
  'too_expensive',
  'too_far',
  'not_my_style',
  'too_crowded',
  'too_hard_for_child',
  'other',
] as const satisfies readonly ReasonCode[]

export const REASON_LABELS: Record<ReasonCode, () => string> = {
  too_expensive: m.reason_too_expensive,
  too_far: m.reason_too_far,
  not_my_style: m.reason_not_my_vibe,
  too_crowded: m.reason_too_crowded,
  too_hard_for_child: m.reason_too_hard_for_child,
  other: m.reason_other,
}
