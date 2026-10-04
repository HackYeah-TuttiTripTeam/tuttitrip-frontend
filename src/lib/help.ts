// Framework-free model of the visual help (guided tour). A view registers a topic; the app
// shell's Help button opens it; GuidedTour highlights elements by their `data-tour` attribute.

/** The attribute that marks an element a tour step can highlight. Never select by CSS class. */
export const TOUR_ATTRIBUTE = 'data-tour'

/** Every `data-tour` value in the app. Add the name here, put it on the element, use it in a step. */
export const TOUR = {
  newTrip: 'new-trip',
  tripsHeader: 'trips-header',
  tripsToolbar: 'trips-toolbar',
  tripsList: 'trips-list',
  tripsPagination: 'trips-pagination',
  tripHeader: 'trip-header',
  tripSettings: 'trip-settings',
  tripTabs: 'trip-tabs',
  peopleList: 'people-list',
  peopleInvite: 'people-invite',
  planEmpty: 'plan-empty',
  planActions: 'plan-actions',
  planSummary: 'plan-summary',
  planDays: 'plan-days',
  fairnessPanel: 'fairness-panel',
  joinTrip: 'join-trip',
  joinName: 'join-name',
  joinSubmit: 'join-submit',
} as const

/** A highlighted target taller than this share of the viewport isolates nothing: plain scrim. */
export const TOUR_TALL_TARGET = 0.6

/** Space around the highlighted element, in px. */
export const TOUR_SPOTLIGHT_PADDING = 6

export interface TourStep {
  id: string
  /** A `TOUR` value. Without it, or when the element is not on the page, the step has no ring. */
  target?: string
  /** Skip the step when its target is not on the page (state-dependent or role-dependent UI). */
  optional?: boolean
  /** Message functions, so the text follows the language at render time. */
  title: () => string
  body: () => string
}

export interface TourTopic {
  id: string
  title: () => string
  steps: readonly TourStep[]
}

const isVisible = (element: Element) =>
  typeof element.checkVisibility === 'function' ? element.checkVisibility() : true

/** The first visible element with this `data-tour` value (the desktop and phone copies differ). */
export function findTourTarget(name: string, root: ParentNode = document): HTMLElement | null {
  for (const element of root.querySelectorAll<HTMLElement>(`[${TOUR_ATTRIBUTE}="${name}"]`)) {
    if (isVisible(element)) return element
  }
  return null
}

/** The steps that apply to the page as it is now: optional steps without a target drop out. */
export function resolveSteps(topic: TourTopic, root: ParentNode = document): TourStep[] {
  return topic.steps.filter(
    (step) => !(step.optional && step.target && !findTourTarget(step.target, root)),
  )
}
