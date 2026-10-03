import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

/**
 * The Worker puts the page's metadata into the first HTML response (tags marked `data-seo`),
 * and the router renders the same tags itself once the app runs. When the router has settled
 * the server copies go, as do older `<title>` and description tags (index.html), keeping the
 * last one, which is the router's. Without this the head would hold every tag twice.
 */
export function useCleanServerHead() {
  const status = useRouterState({ select: (state) => state.status })
  useEffect(() => {
    if (status !== 'idle') return
    for (const element of document.head.querySelectorAll('[data-seo]')) element.remove()
    for (const selector of ['title', 'meta[name="description"]']) {
      const found = document.head.querySelectorAll(selector)
      for (const element of [...found].slice(0, -1)) element.remove()
    }
  }, [status])
}
