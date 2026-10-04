import { useSyncExternalStore } from 'react'
import { type DemoStatus, getDemoStatus, subscribeDemo } from '@/lib/demo-session'

/** Whether this tab holds a demo session, and whether it just ran out. */
export function useDemoStatus(): DemoStatus {
  return useSyncExternalStore(subscribeDemo, getDemoStatus, getDemoStatus)
}
