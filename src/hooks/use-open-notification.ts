import { useNavigate, useRouterState } from '@tanstack/react-router'

/**
 * Opens a notification's detail dialog from anywhere (bell, toast): the dialog lives on
 * /notifications and the id rides in `?open=`, so a reload or a shared link shows it again.
 */
export function useOpenNotification() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (id: string) =>
    void navigate({
      to: '/notifications',
      // On the page itself keep its filters and page; elsewhere start clean. The reducer is
      // untyped on purpose: `navigate` types `search` per route, and this one serves several.
      search: (pathname === '/notifications'
        ? (prev: object) => ({ ...prev, open: id })
        : { open: id }) as never,
    })
}
