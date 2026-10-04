// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDemoStatus, resetDemoSessionForTests, setDemoSession } from '@/lib/demo-session'
import { setAuthConfig } from '@/lib/env'
import { useSession } from './use-session'

const auth0 = vi.hoisted(() => ({
  isLoading: false,
  isAuthenticated: false,
  user: undefined,
  error: undefined,
  loginWithRedirect: vi.fn(async () => undefined),
  logout: vi.fn(async () => undefined),
}))
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => auth0 }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: vi.fn() }) }))

beforeEach(() => {
  resetDemoSessionForTests()
  auth0.loginWithRedirect.mockClear()
  setAuthConfig({ domain: 'x.invalid', clientId: 'c', audience: undefined })
})

describe('useSession in demo mode', () => {
  it('a real login first ends the shared demo session, then goes to Auth0', () => {
    setDemoSession('demo-access', 3600, 'inv')
    const { result } = renderHook(() => useSession())
    expect(result.current.status).toBe('authenticated')

    result.current.login()

    expect(getDemoStatus()).toBe('none')
    expect(auth0.loginWithRedirect).toHaveBeenCalledTimes(1)
  })

  it('sign-up does the same, on the sign-up screen', () => {
    setDemoSession('demo-access', 3600, 'inv')
    const { result } = renderHook(() => useSession())

    result.current.signup()

    expect(getDemoStatus()).toBe('none')
    expect(auth0.loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ authorizationParams: { screen_hint: 'signup' } }),
    )
  })
})
