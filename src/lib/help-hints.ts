import { m } from '@/paraglide/messages'

/**
 * Every "?" hint: a title and one or two sentences, in the vocabulary of the architecture
 * document and docs/algorytm.md. Add a topic here and its keys to messages/*.json; HelpHint
 * takes the id.
 */
export const HELP_HINTS = {
  weights: { title: m.help_weights_title, body: m.help_weights_body },
  alpha: { title: m.help_alpha_title, body: m.help_alpha_body },
  floor: { title: m.help_floor_title, body: m.help_floor_body },
  jain: { title: m.help_jain_title, body: m.help_jain_body },
  weakest: { title: m.help_weakest_title, body: m.help_weakest_body },
  cost: { title: m.help_cost_title, body: m.help_cost_body },
  budget: { title: m.help_budget_title, body: m.help_budget_body },
  veto: { title: m.help_veto_title, body: m.help_veto_body },
  role: { title: m.help_role_title, body: m.help_role_body },
  status: { title: m.help_status_title, body: m.help_status_body },
  settlement: { title: m.help_settlement_title, body: m.help_settlement_body },
} as const

export type HelpHintId = keyof typeof HELP_HINTS

/** A mouse or trackpad: hover and focus show the tip. Anything else taps. */
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
