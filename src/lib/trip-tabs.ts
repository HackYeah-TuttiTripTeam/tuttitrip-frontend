/** The tabs of the trip view, in display order. Shared by the loader's schema and the tab bar. */
export const TRIP_TABS = ['interview', 'people', 'members', 'plan', 'photos', 'locations'] as const
export type TripTab = (typeof TRIP_TABS)[number]
