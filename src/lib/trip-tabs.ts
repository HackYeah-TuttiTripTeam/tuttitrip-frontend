/** The tabs of the trip view, in display order. Shared by the loader's schema and the tab bar. */
export const TRIP_TABS = ['interview', 'people', 'members', 'plan', 'expenses'] as const
export type TripTab = (typeof TRIP_TABS)[number]

/** The two parts of the Plan tab: the plan itself and the check of a plan pasted from a chatbot. */
export const PLAN_VIEWS = ['plan', 'check'] as const
export type PlanView = (typeof PLAN_VIEWS)[number]
