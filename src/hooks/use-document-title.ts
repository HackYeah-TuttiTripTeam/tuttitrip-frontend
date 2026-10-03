import { useEffect } from 'react'

const SITE = 'TuttiTrip'

/**
 * "Page · TuttiTrip" in the tab title while the page is mounted. The cleanup puts the site
 * name back, so the next route (which may set no title) never inherits this one.
 */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · ${SITE}` : SITE
    return () => {
      document.title = SITE
    }
  }, [page])
}
