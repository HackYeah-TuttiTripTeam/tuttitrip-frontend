import { create } from 'zustand'
import type { TourTopic } from '@/lib/help'

interface HelpState {
  /** The tour of the page on screen; null when the page has none (the Help button hides). */
  topic: TourTopic | null
  open: boolean
  setTopic: (topic: TourTopic | null) => void
  setOpen: (open: boolean) => void
}

export const useHelpStore = create<HelpState>()((set) => ({
  topic: null,
  open: false,
  setTopic: (topic) => set({ topic, open: false }),
  setOpen: (open) => set({ open }),
}))
