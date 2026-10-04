import { describe, expect, it } from 'vitest'
import { fetchClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { PROFILE_IDS, TRIP_ID } from './fixtures'
import { useScenario } from './node'
import { pickScenario, type ScenarioName } from './scenarios'

const path = { params: { path: { trip_id: TRIP_ID } } }

/** The status the real client reports (it throws ApiError for every non-2xx answer). */
async function statusOf(call: () => Promise<unknown>): Promise<number | 'network'> {
  try {
    await call()
    return 200
  } catch (error) {
    if (error instanceof ApiError) return error.status
    if (error instanceof TypeError) return 'network'
    throw error
  }
}

const latestPlan = () => fetchClient.GET('/api/v1/trips/{trip_id}/plans/latest', path)
const computePlan = () => fetchClient.POST('/api/v1/trips/{trip_id}/plans', path)

describe('family-warsaw', () => {
  it('has a family of five with a grandmother and two children', async () => {
    const { data } = await fetchClient.GET('/api/v1/trips/{trip_id}/profiles', path)
    expect(data?.map((p) => p.age_group)).toEqual(['adult', 'adult', 'senior', 'child', 'toddler'])
    expect(data?.find((p) => p.id === PROFILE_IDS.babcia)?.weight).toBe(1.5)
  })

  it('marks the comfort fields the host changed, and only those', async () => {
    const { data } = await fetchClient.GET('/api/v1/trips/{trip_id}/profiles', path)
    const changed = Object.fromEntries(
      (data ?? []).map((p) => [p.display_name, p.customized_fields]),
    )
    expect(changed['Babcia Halina']).toEqual(['segment_km', 'daily_km'])
    expect(changed.Ola).toEqual([])
    expect(changed.Antek).toEqual([])
  })

  it('has members with every role, joinable with profiles on profile_id', async () => {
    const [members, profiles] = await Promise.all([
      fetchClient.GET('/api/v1/trips/{trip_id}/members', path),
      fetchClient.GET('/api/v1/trips/{trip_id}/profiles', path),
    ])
    expect(members.data?.map((member) => member.role)).toEqual(['host', 'co_host', 'member'])
    expect(members.data?.filter((member) => member.is_me)).toHaveLength(1)
    for (const member of members.data ?? [])
      expect(profiles.data?.find((p) => p.id === member.profile_id)?.display_name).toBe(
        member.display_name,
      )
  })

  it('lets the host change a role and remove a member', async () => {
    const id = PROFILE_IDS.babcia
    const params = { params: { path: { trip_id: TRIP_ID, profile_id: id } } }
    const changed = await fetchClient.PATCH('/api/v1/trips/{trip_id}/members/{profile_id}', {
      ...params,
      body: { role: 'co_host' },
    })
    expect(changed.data?.role).toBe('co_host')
    await fetchClient.DELETE('/api/v1/trips/{trip_id}/members/{profile_id}', params)
    const { data } = await fetchClient.GET('/api/v1/trips/{trip_id}/members', path)
    expect(data?.map((member) => member.profile_id)).not.toContain(id)
  })

  it('creates a trip and lists it first', async () => {
    const created = await fetchClient.POST('/api/v1/trips', { body: { name: 'Gdańsk' } })
    expect(created.data?.name).toBe('Gdańsk')
    const list = await fetchClient.GET('/api/v1/trips')
    expect(list.data?.items[0]?.name).toBe('Gdańsk')
  })
})

describe('needs-approval', () => {
  it('has a budget above B_do with kappa and a pending approval', async () => {
    useScenario('needs-approval')
    const { data } = await latestPlan()
    expect(data?.budget).toMatchObject({
      zone: 'in_margin',
      needs_approval: true,
      kappa: '3.00',
      approval_status: 'pending',
    })
    expect(Number(data?.budget.cost)).toBeGreaterThan(Number(data?.budget.b_to))
  })
})

describe('member-readonly', () => {
  it('reads as a member but gets 403 on every write', async () => {
    useScenario('member-readonly')
    expect((await fetchClient.GET('/api/v1/trips/{trip_id}', path)).data?.my_role).toBe('member')
    expect(
      await statusOf(() =>
        fetchClient.POST('/api/v1/trips/{trip_id}/profiles', {
          ...path,
          body: { display_name: 'Kuba', age: 30 },
        }),
      ),
    ).toBe(403)
    expect(
      await statusOf(() =>
        fetchClient.DELETE('/api/v1/trips/{trip_id}/profiles/{profile_id}', {
          params: { path: { trip_id: TRIP_ID, profile_id: PROFILE_IDS.tata } },
        }),
      ),
    ).toBe(403)
    expect(await statusOf(computePlan)).toBe(403)
    expect(
      await statusOf(() =>
        fetchClient.PATCH('/api/v1/trips/{trip_id}/members/{profile_id}', {
          params: { path: { trip_id: TRIP_ID, profile_id: PROFILE_IDS.babcia } },
          body: { role: 'co_host' },
        }),
      ),
    ).toBe(403)
  })
})

describe('broken servers', () => {
  it('server-error answers 500 everywhere', async () => {
    useScenario('server-error')
    expect(await statusOf(() => fetchClient.GET('/api/v1/trips'))).toBe(500)
    expect(await statusOf(latestPlan)).toBe(500)
  })

  it('offline fails like a lost connection', async () => {
    useScenario('offline')
    expect(await statusOf(() => fetchClient.GET('/api/v1/trips'))).toBe('network')
  })
})

describe('no real API', () => {
  it.each(['family-warsaw', 'no-plan', 'member-readonly'] as const)(
    'answers an endpoint without a mock handler with 501 and says so (%s)',
    async (name) => {
      useScenario(name)
      const response = await fetch('/api/v1/vote/access')
      expect(response.status).toBe(501)
      expect(await response.json()).toEqual({
        detail: 'No mock handler for GET /api/v1/vote/access',
      })
    },
  )
})

describe('pickScenario', () => {
  const pick = (search: string, stored: string | null): ScenarioName => pickScenario(search, stored)

  it('prefers the URL, then the stored one, then the default', () => {
    expect(pick('?scenario=no-plan', 'offline')).toBe('no-plan')
    expect(pick('', 'offline')).toBe('offline')
    expect(pick('', null)).toBe('family-warsaw')
  })

  it('ignores unknown names', () => {
    expect(pick('?scenario=nope', 'nope')).toBe('family-warsaw')
  })
})

describe('join scenarios', () => {
  const preview = () => fetchClient.POST('/api/v1/invitations/preview', { body: { token: 't' } })
  const accept = () => fetchClient.POST('/api/v1/invitations/accept', { body: { token: 't' } })

  it('join-valid previews and accepts', async () => {
    useScenario('join-valid')
    expect((await preview()).data).toMatchObject({ already_member: false })
    expect((await accept()).data).toMatchObject({ trip_id: TRIP_ID, already_member: false })
  })

  it('join-dead answers 404 to both', async () => {
    useScenario('join-dead')
    expect(await statusOf(preview)).toBe(404)
    expect(await statusOf(accept)).toBe(404)
  })

  it('join-already-member says so in both answers', async () => {
    useScenario('join-already-member')
    expect((await preview()).data?.already_member).toBe(true)
    expect((await accept()).data?.already_member).toBe(true)
  })

  it('join-accept-dead previews fine and then answers 404', async () => {
    useScenario('join-accept-dead')
    expect(await statusOf(preview)).toBe(200)
    expect(await statusOf(accept)).toBe(404)
  })

  it('join-claimable offers the profiles without an account and accepts a claim', async () => {
    useScenario('join-claimable')
    const { data } = await preview()
    expect(data?.claimable_profiles.map((p) => p.display_name)).toEqual(['Zosia', 'Antek'])
    const claimed = await fetchClient.POST('/api/v1/invitations/accept', {
      body: { token: 't', profile_id: PROFILE_IDS.zosia },
    })
    expect(claimed.data).toMatchObject({ profile_id: PROFILE_IDS.zosia, profile_claimed: true })
  })

  it('join-claim-taken answers 409 for the lost profile and drops it from the list', async () => {
    useScenario('join-claim-taken')
    const claim = () =>
      fetchClient.POST('/api/v1/invitations/accept', {
        body: { token: 't', profile_id: PROFILE_IDS.zosia },
      })
    expect(await statusOf(claim)).toBe(409)
    expect((await preview()).data?.claimable_profiles.map((p) => p.display_name)).toEqual(['Antek'])
  })

  it('join-named lists one profile and refuses any other with 409', async () => {
    useScenario('join-named')
    expect((await preview()).data?.claimable_profiles.map((p) => p.display_name)).toEqual(['Zosia'])
    const other = () =>
      fetchClient.POST('/api/v1/invitations/accept', {
        body: { token: 't', profile_id: PROFILE_IDS.antek },
      })
    expect(await statusOf(other)).toBe(409)
  })

  it('serves the invitation list, a token only on creation, and a revoke', async () => {
    const path = { params: { path: { trip_id: TRIP_ID } } }
    const list = await fetchClient.GET('/api/v1/trips/{trip_id}/invitations', path)
    expect(list.data).toHaveLength(1)
    expect(JSON.stringify(list.data)).not.toContain('token')
    const created = await fetchClient.POST('/api/v1/trips/{trip_id}/invitations', {
      ...path,
      body: { expires_in_days: 7, max_uses: 10 },
    })
    expect(created.data?.token).toBeTruthy()
    expect(created.response.headers.get('cache-control')).toBe('no-store')
    const revoked = await fetchClient.DELETE(
      '/api/v1/trips/{trip_id}/invitations/{invitation_id}',
      {
        params: { path: { trip_id: TRIP_ID, invitation_id: created.data?.id ?? '' } },
      },
    )
    expect(revoked.data?.revoked_at).toBeTruthy()
  })
})
