import { useEffect } from 'react'

const SITE = 'TuttiTrip'

/** "Page · TuttiTrip" in the tab title; the site name alone when no page name is given. */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · ${SITE}` : SITE
  }, [page])
}
