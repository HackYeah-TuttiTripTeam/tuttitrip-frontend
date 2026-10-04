import { create } from 'zustand'
import type { StreamStatus } from '@/lib/notification-stream'

interface NotificationState {
  /** State of the live stream: the counter polls unless it is `open`. */
  streamStatus: StreamStatus
  setStreamStatus: (status: StreamStatus) => void
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  streamStatus: 'connecting',
  setStreamStatus: (streamStatus) => set({ streamStatus }),
}))
