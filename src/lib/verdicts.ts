import type {
  ExplainEntry,
  Plan,
  PlanBudget,
  PlanVerdict,
  ReasonCode,
  VerdictKind,
} from '@/api/queries/plans'
import { m } from '@/paraglide/messages'

export const VERDICT_LABELS: Record<VerdictKind, () => string> = {
  must: m.verdict_must,
  fits: m.verdict_fits,
  iconic_not_yours: m.verdict_iconic_not_yours,
  skip: m.verdict_skip,
}

/** One line under the chip: what the verdict means, in words. */
export const VERDICT_MEANINGS: Record<VerdictKind, () => string> = {
  must: m.verdict_must_meaning,
  fits: m.verdict_fits_meaning,
  iconic_not_yours: m.verdict_iconic_not_yours_meaning,
  skip: m.verdict_skip_meaning,
}

/** The reasons of the API's closed list (`ReasonCode`), in Polish and English through Paraglide. */
export const REASON_LABELS: Record<ReasonCode, () => string> = {
  too_expensive: m.reason_too_expensive,
  too_far: m.reason_too_far,
  not_my_style: m.reason_not_my_vibe,
  too_crowded: m.reason_too_crowded,
  too_hard_for_child: m.reason_too_hard_for_child,
  other: m.reason_other,
}

const SKIP_LABELS: Record<string, (() => string) | undefined> = {
  veto: m.skip_veto,
  blocked: m.skip_blocked,
  closed: m.skip_closed,
  no_fit: m.skip_no_fit,
  segment: m.skip_segment,
  stairs: m.skip_stairs,
}

/** A skip code of the API; a code this client does not know yet is shown as it is. */
export const skipLabel = (code: string): string => SKIP_LABELS[code]?.() ?? code

const CONFLICT_LABELS: Record<string, (() => string) | undefined> = {
  lodging_hard_requirement: m.conflict_lodging_hard_requirement,
  veto_blocks_place: m.conflict_veto_blocks_place,
  budget_limit: m.conflict_budget_limit,
  floor_unreachable: m.conflict_floor_unreachable,
  unknown_price: m.conflict_unknown_price,
  other: m.conflict_other,
}

export const conflictLabel = (code: string): string => CONFLICT_LABELS[code]?.() ?? code

/** Verdicts by place, the places the plan left out, and the E1 numbers per person. */
export interface VerdictIndex {
  byPlace: ReadonlyMap<string, PlanVerdict>
  /** Verdict "skip": candidates that are not in the plan. */
  skipped: PlanVerdict[]
  explainByPlace: ReadonlyMap<string, ExplainEntry[]>
}

export function indexVerdicts(plan: Pick<Plan, 'verdicts' | 'explain'>): VerdictIndex {
  const verdicts = plan.verdicts ?? []
  const explainByPlace = new Map<string, ExplainEntry[]>()
  for (const entry of plan.explain ?? []) {
    explainByPlace.set(entry.place_id, [...(explainByPlace.get(entry.place_id) ?? []), entry])
  }
  return {
    byPlace: new Map(verdicts.map((verdict) => [verdict.place_id, verdict])),
    skipped: verdicts.filter((verdict) => verdict.verdict === 'skip'),
    explainByPlace,
  }
}

/** The plan waits for the host: cost over B_do and the decision is still open. */
export const awaitsBudgetApproval = (budget: PlanBudget): boolean =>
  budget.needs_approval && budget.approval_status === 'pending'
