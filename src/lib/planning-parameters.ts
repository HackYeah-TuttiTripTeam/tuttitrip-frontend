import { z } from 'zod'
import type { Schemas } from '@/api/client'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** The set of algorithm parameters exactly as the API stores it (docs/algorytm.md, section 6). */
export type PlanningValues = Schemas['AlgorithmParams']
export type ParameterKey = keyof PlanningValues

export const PARAMETER_GROUPS = ['fairness', 'place', 'day', 'budget', 'limits'] as const
export type ParameterGroup = (typeof PARAMETER_GROUPS)[number]

export const GROUP_TITLES: Record<ParameterGroup, () => string> = {
  fairness: () => m.planning_group_fairness(),
  place: () => m.planning_group_place(),
  day: () => m.planning_group_day(),
  budget: () => m.planning_group_budget(),
  limits: () => m.planning_group_limits(),
}

export interface ParameterSpec {
  key: ParameterKey
  group: ParameterGroup
  /** The range the API accepts (`AlgorithmParams` in the backend); a bound can exclude its value. */
  min: number
  max: number
  minExclusive?: boolean
  maxExclusive?: boolean
  integer?: boolean
  /** Step of the arrow keys; any value in range is accepted. */
  step: number
  /** The built-in version 0, the value "Restore" puts back. */
  fallback: number
  name: () => string
  help: () => string
}

/**
 * The ranges and defaults mirror `AlgorithmParams` of tuttitrip-backend (backend#96); the API
 * stays the authority and its 422 lands on the field it names. Every value is uncalibrated.
 */
export const PARAMETERS: readonly ParameterSpec[] = [
  {
    key: 'alpha',
    group: 'fairness',
    min: 0,
    max: 3,
    step: 0.1,
    fallback: 1,
    name: () => m.planning_param_alpha_name(),
    help: () => m.planning_param_alpha_help(),
  },
  {
    key: 'floor_share',
    group: 'fairness',
    min: 0,
    max: 1,
    step: 0.05,
    fallback: 0.6,
    name: () => m.planning_param_floor_share_name(),
    help: () => m.planning_param_floor_share_help(),
  },
  {
    key: 'smoothing',
    group: 'fairness',
    min: 0,
    max: 100,
    minExclusive: true,
    step: 1,
    fallback: 10,
    name: () => m.planning_param_smoothing_name(),
    help: () => m.planning_param_smoothing_help(),
  },
  {
    key: 'violation_penalty',
    group: 'fairness',
    min: 1,
    max: 1_000_000,
    step: 100,
    fallback: 1000,
    name: () => m.planning_param_violation_penalty_name(),
    help: () => m.planning_param_violation_penalty_help(),
  },
  {
    key: 'vote_weight',
    group: 'place',
    min: 0,
    max: 1,
    step: 0.05,
    fallback: 0.7,
    name: () => m.planning_param_vote_weight_name(),
    help: () => m.planning_param_vote_weight_help(),
  },
  {
    key: 'no_data_match',
    group: 'place',
    min: 0,
    max: 1,
    step: 0.05,
    fallback: 0.5,
    name: () => m.planning_param_no_data_match_name(),
    help: () => m.planning_param_no_data_match_help(),
  },
  {
    key: 'own_place_match',
    group: 'place',
    min: 0,
    max: 1,
    step: 0.05,
    fallback: 0.6,
    name: () => m.planning_param_own_place_match_name(),
    help: () => m.planning_param_own_place_match_help(),
  },
  {
    key: 'lambda_floor',
    group: 'place',
    min: 0,
    max: 1,
    step: 0.05,
    fallback: 0.1,
    name: () => m.planning_param_lambda_floor_name(),
    help: () => m.planning_param_lambda_floor_help(),
  },
  {
    key: 'epsilon',
    group: 'place',
    min: 0,
    max: 1,
    minExclusive: true,
    step: 0.01,
    fallback: 0.01,
    name: () => m.planning_param_epsilon_name(),
    help: () => m.planning_param_epsilon_help(),
  },
  {
    key: 'kappa_attractions',
    group: 'day',
    min: 0,
    max: 5,
    minExclusive: true,
    step: 0.1,
    fallback: 0.6,
    name: () => m.planning_param_kappa_attractions_name(),
    help: () => m.planning_param_kappa_attractions_help(),
  },
  {
    key: 'kappa_food',
    group: 'day',
    min: 0,
    max: 5,
    minExclusive: true,
    step: 0.1,
    fallback: 1.2,
    name: () => m.planning_param_kappa_food_name(),
    help: () => m.planning_param_kappa_food_help(),
  },
  {
    key: 'tau_ref_min',
    group: 'day',
    min: 15,
    max: 480,
    integer: true,
    step: 5,
    fallback: 90,
    name: () => m.planning_param_tau_ref_min_name(),
    help: () => m.planning_param_tau_ref_min_help(),
  },
  {
    key: 'cost_comfort',
    group: 'day',
    min: 0,
    max: 100,
    step: 5,
    fallback: 60,
    name: () => m.planning_param_cost_comfort_name(),
    help: () => m.planning_param_cost_comfort_help(),
  },
  {
    key: 'uncertain_requirement',
    group: 'day',
    min: 0,
    max: 1,
    step: 0.05,
    fallback: 0.4,
    name: () => m.planning_param_uncertain_requirement_name(),
    help: () => m.planning_param_uncertain_requirement_help(),
  },
  {
    key: 'unverified_markup',
    group: 'budget',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: 0.15,
    name: () => m.planning_param_unverified_markup_name(),
    help: () => m.planning_param_unverified_markup_help(),
  },
  {
    key: 'strong_preference',
    group: 'budget',
    min: 0,
    max: 1,
    minExclusive: true,
    maxExclusive: true,
    step: 0.05,
    fallback: 0.4,
    name: () => m.planning_param_strong_preference_name(),
    help: () => m.planning_param_strong_preference_help(),
  },
  {
    key: 'good_reason_points',
    group: 'budget',
    min: 0,
    max: 100,
    step: 1,
    fallback: 8,
    name: () => m.planning_param_good_reason_points_name(),
    help: () => m.planning_param_good_reason_points_help(),
  },
  {
    key: 'good_reason_min_r',
    group: 'budget',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: 0.05,
    name: () => m.planning_param_good_reason_min_r_name(),
    help: () => m.planning_param_good_reason_min_r_help(),
  },
  {
    key: 'good_reason_welfare',
    group: 'budget',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: 0.03,
    name: () => m.planning_param_good_reason_welfare_name(),
    help: () => m.planning_param_good_reason_welfare_help(),
  },
  {
    key: 'cheaper_margin',
    group: 'budget',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: 0.05,
    name: () => m.planning_param_cheaper_margin_name(),
    help: () => m.planning_param_cheaper_margin_help(),
  },
  {
    key: 'stairs_limit',
    group: 'limits',
    min: 0,
    max: 1,
    minExclusive: true,
    step: 0.05,
    fallback: 0.9,
    name: () => m.planning_param_stairs_limit_name(),
    help: () => m.planning_param_stairs_limit_help(),
  },
  {
    key: 'segment_factor',
    group: 'limits',
    min: 1,
    max: 10,
    step: 0.1,
    fallback: 1.5,
    name: () => m.planning_param_segment_factor_name(),
    help: () => m.planning_param_segment_factor_help(),
  },
  {
    key: 'verdict_fits',
    group: 'limits',
    min: -1,
    max: 1,
    step: 0.05,
    fallback: 0.1,
    name: () => m.planning_param_verdict_fits_name(),
    help: () => m.planning_param_verdict_fits_help(),
  },
  {
    key: 'verdict_iconic',
    group: 'limits',
    min: -1,
    max: 1,
    step: 0.05,
    fallback: -0.3,
    name: () => m.planning_param_verdict_iconic_name(),
    help: () => m.planning_param_verdict_iconic_help(),
  },
]

export const specsOf = (group: ParameterGroup) => PARAMETERS.filter((spec) => spec.group === group)

/** Version 0, the built-in set: what the API serves before anybody stores a version. */
export const defaultValues = (): PlanningValues =>
  Object.fromEntries(PARAMETERS.map((spec) => [spec.key, spec.fallback])) as PlanningValues

/** "0 to 3", "above 0 to 5", "0 to below 1": the range as a sentence fragment. */
export function describeRange(spec: ParameterSpec): string {
  const min = formatNumber(spec.min)
  const max = formatNumber(spec.max)
  if (spec.minExclusive && spec.maxExclusive) return m.planning_range_open({ min, max })
  if (spec.minExclusive) return m.planning_range_above({ min, max })
  if (spec.maxExclusive) return m.planning_range_below({ min, max })
  return m.planning_range_closed({ min, max })
}

export function inRange(spec: ParameterSpec, value: number): boolean {
  if (!Number.isFinite(value)) return false
  if (spec.integer && !Number.isInteger(value)) return false
  const aboveMin = spec.minExclusive ? value > spec.min : value >= spec.min
  const belowMax = spec.maxExclusive ? value < spec.max : value <= spec.max
  return aboveMin && belowMax
}

const NOTE_MAX = 500

const fieldSchema = (spec: ParameterSpec) =>
  z.number({ error: () => m.planning_error_number() }).refine((value) => inRange(spec, value), {
    error: () =>
      spec.integer && spec.min !== undefined
        ? m.planning_error_integer_range({ range: describeRange(spec) })
        : m.planning_error_range({ range: describeRange(spec) }),
  })

/** The form: one number per parameter (all must be in the API's range) and a note. */
export const planningFormSchema = z
  .object({
    ...(Object.fromEntries(PARAMETERS.map((spec) => [spec.key, fieldSchema(spec)])) as Record<
      ParameterKey,
      ReturnType<typeof fieldSchema>
    >),
    note: z.string().max(NOTE_MAX, { error: () => m.planning_error_note_long({ max: NOTE_MAX }) }),
  })
  .refine((values) => values.verdict_iconic < values.verdict_fits, {
    path: ['verdict_iconic'],
    error: () => m.planning_error_verdict_order(),
  })

export type PlanningFormValues = z.infer<typeof planningFormSchema>

export const toFormValues = (values: PlanningValues, note = ''): PlanningFormValues => ({
  ...values,
  note,
})

export function toRequest(form: PlanningFormValues): {
  values: PlanningValues
  note: string | null
} {
  const { note, ...values } = form
  return { values, note: note.trim() || null }
}

/** Whether any parameter differs from the version in force. */
export function differs(form: PlanningFormValues, current: PlanningValues): boolean {
  return PARAMETERS.some((spec) => form[spec.key] !== current[spec.key])
}

/** Keys of the 422 items the API sends for `values.<key>`, mapped onto form fields. */
export function mapValidationErrors(detail: unknown): Partial<Record<ParameterKey, string>> {
  const errors: Partial<Record<ParameterKey, string>> = {}
  if (!Array.isArray(detail)) return errors
  for (const item of detail) {
    if (typeof item !== 'object' || item === null || !('loc' in item) || !Array.isArray(item.loc)) {
      continue
    }
    const key = PARAMETERS.find((spec) => item.loc.includes(spec.key))?.key
    if (key && !errors[key]) errors[key] = 'msg' in item ? String(item.msg) : ''
  }
  return errors
}
