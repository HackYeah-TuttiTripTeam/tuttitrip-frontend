import { m } from '@/paraglide/messages'
import { BUILD_PLAN_TOOL, type VoiceActivity } from './voice-events'

/** What a tool of the assistant is about, in words the host knows ("saving: budget"). */
const WHAT: Record<string, () => string> = {
  set_trip_basics: m.voice_what_trip,
  add_person: m.voice_what_people,
  update_person: m.voice_what_people,
  set_budget: m.voice_what_budget,
  set_constraint: m.voice_what_preferences,
  set_diet: m.voice_what_preferences,
  add_interest: m.voice_what_preferences,
  set_importance_points: m.voice_what_preferences,
  classify_diet: m.voice_what_preferences,
  classify_constraint: m.voice_what_preferences,
  [BUILD_PLAN_TOOL]: m.voice_what_plan,
}

export const toolLabel = (name: string | null | undefined): string =>
  (name ? WHAT[name] : undefined)?.() ?? m.voice_what_data()

/** The line that says what the call is doing, for the screen and for a screen reader. */
export function activityText(activity: VoiceActivity, toolName: string | null): string {
  switch (activity) {
    case 'saving':
      return m.voice_activity_saving({ what: toolLabel(toolName) })
    case 'building_plan':
      return m.voice_activity_building_plan()
    case 'speaking':
      return m.voice_activity_speaking()
    case 'thinking':
      return m.voice_activity_thinking()
    case 'hearing':
      return m.voice_activity_hearing()
    case 'listening':
      return m.voice_activity_listening()
  }
}
