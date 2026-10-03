import { create } from 'zustand'

interface UiState {
  /** The "new trip" drawer/dialog; opened from the app shell and the empty state. */
  createTripOpen: boolean
  setCreateTripOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  createTripOpen: false,
  setCreateTripOpen: (open) => set({ createTripOpen: open }),
}))
