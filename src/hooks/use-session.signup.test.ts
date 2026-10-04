// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoSessionForTests } from '@/lib/demo-session'
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

describe('useSession sign-up', () => {
  it('opens the Auth0 sign-up screen straight away, not the login one', () => {
    const { result } = renderHook(() => useSession())

    result.current.signup()

    expect(auth0.loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ authorizationParams: { screen_hint: 'signup' } }),
    )
  })

  it('login sends no screen hint', () => {
    const { result } = renderHook(() => useSession())

    result.current.login()

    expect(auth0.loginWithRedirect).toHaveBeenCalledWith(
      expect.not.objectContaining({ authorizationParams: expect.anything() }),
    )
  })
})
