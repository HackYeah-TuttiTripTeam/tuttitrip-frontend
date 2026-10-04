import { m } from '@/paraglide/messages'

/** The rules of the linter by their API code; a code we do not know yet is shown as it comes. */
const RULE_LABELS: Record<string, () => string> = {
  closed_day: m.lint_rule_closed_day,
  opening_hours: m.lint_rule_opening_hours,
  transfer: m.lint_rule_transfer,
  budget: m.lint_rule_budget,
  unknown_place: m.lint_rule_unknown_place,
  distance: m.lint_rule_distance,
  pace: m.lint_rule_pace,
  rest_window: m.lint_rule_rest_window,
  accessibility: m.lint_rule_accessibility,
  accommodation_requirements: m.lint_rule_accommodation_requirements,
}

export const ruleLabel = (code: string): string => RULE_LABELS[code]?.() ?? code
