import { useEffect } from 'react'
import type { TourTopic } from '@/lib/help'
import { useHelpStore } from '@/stores/help-store'

/** Registers the tour of the page on screen; null hides the Help button. Clears on unmount. */
export function useHelpTopic(topic: TourTopic | null) {
  const setTopic = useHelpStore((state) => state.setTopic)
  useEffect(() => {
    setTopic(topic)
    // Clear only our own registration: the next page may already have set its own.
    return () => {
      if (useHelpStore.getState().topic === topic) setTopic(null)
    }
  }, [topic, setTopic])
}
