import { HttpResponse, http } from 'msw'
import type { Schemas } from '@/api/client'
import type { Me } from './fixtures'

type FeatureNode = Schemas['FeatureNode']
type Feature = Schemas['Feature']
type Access = Schemas['Access']
type Role = Schemas['RoleRead']
type FeatureGrant = Schemas['FeatureGrant']
type AuditEntry = Schemas['AuditEntryRead']

/** What `/admin/permissions/*` serves in a scenario. The handlers change it, like the real API. */
export interface PermissionsWorld {
  features: FeatureNode
  roles: Role[]
  /** Subs with their assigned roles and direct grants. */
  users: Map<string, { roles: string[]; grants: FeatureGrant[] }>
  audit: AuditEntry[]
}

const node = (code: Feature, description: string, children: FeatureNode[] = []): FeatureNode => ({
  code,
  description,
  children,
})

export const featureTree = (): FeatureNode =>
  node('*', 'Wszystko', [
    node('accounts', 'Konta', [node('accounts.profile', 'Własny profil')]),
    node('admin', 'Administracja', [
      node('admin.permissions', 'Uprawnienia'),
      node('admin.users', 'Użytkownicy'),
    ]),
    node('trips', 'Wyjazdy', [
      node('trips.core', 'Wyjazd i jego dane'),
      node('trips.members', 'Uczestnicy'),
      node('trips.invitations', 'Zaproszenia'),
    ]),
    node('profiles', 'Profile osób', [
      node('profiles.core', 'Dane osoby'),
      node('profiles.preferences', 'Preferencje'),
    ]),
    node('planning', 'Planowanie', [node('planning.plans', 'Plany')]),
  ])

export const ADMIN_SUB = 'auth0|mock-admin'
export const OTHER_SUB = 'auth0|ola-kowalska'

export const createPermissionsWorld = (): PermissionsWorld => ({
  features: featureTree(),
  roles: [
    {
      name: 'superadmin',
      description: 'Pełny dostęp, nadawany tylko z Auth0.',
      is_system: true,
      grants: [{ feature: '*', level: 'WRITE' }],
    },
    {
      name: 'user',
      description: 'Domyślna rola każdego konta.',
      is_system: true,
      grants: [
        { feature: 'trips', level: 'WRITE' },
        { feature: 'profiles', level: 'WRITE' },
      ],
    },
    {
      name: 'moderator',
      description: 'Wgląd w wyjazdy bez zmian.',
      is_system: false,
      grants: [{ feature: 'trips', level: 'READ' }],
    },
  ],
  users: new Map([
    [OTHER_SUB, { roles: ['moderator'], grants: [{ feature: 'planning', level: 'READ' }] }],
    [ADMIN_SUB, { roles: [], grants: [{ feature: 'admin.permissions', level: 'WRITE' }] }],
  ]),
  audit: [
    {
      id: 2,
      actor_sub: ADMIN_SUB,
      action: 'user.role.assign',
      target_sub: OTHER_SUB,
      target_role: 'moderator',
      change: {},
      created_at: '2026-10-03T10:30:00Z',
    },
    {
      id: 1,
      actor_sub: ADMIN_SUB,
      action: 'role.create',
      target_sub: null,
      target_role: 'moderator',
      change: { grants: [{ feature: 'trips', level: 'READ' }] },
      created_at: '2026-10-02T08:00:00Z',
    },
  ],
})

const codes = (tree: FeatureNode): Feature[] => [tree.code, ...(tree.children ?? []).flatMap(codes)]

/**
 * An admin who may manage permissions (`WRITE`) or only look (`READ`), without being a superadmin:
 * full access to the product features, only `READ` on `admin` and nothing on `*`. Levels are
 * flattened per code, like `GET /me` does.
 */
export function adminMe(level: Access, base: Me): Me {
  const access: Record<string, Access> = {}
  for (const code of codes(featureTree())) {
    if (code !== '*' && !code.startsWith('admin')) access[code] = 'WRITE'
  }
  return {
    ...base,
    sub: ADMIN_SUB,
    access: { ...access, admin: 'READ', 'admin.permissions': level },
  }
}

const RANK: Record<Access, number> = { READ: 1, WRITE: 2 }
const rank = (level: Access | undefined) => (level ? RANK[level] : 0)

const tooMuch = () =>
  HttpResponse.json({ detail: 'Nie możesz nadać więcej uprawnień, niż sam masz.' }, { status: 403 })
const forbidden = () =>
  HttpResponse.json({ detail: 'Brak uprawnienia do tej operacji' }, { status: 403 })
const notFound = (detail: string) => HttpResponse.json({ detail }, { status: 404 })

/** Effective level of the caller on a feature; the API flattens groups into `me.access`. */
const callerLevel = (me: Me, feature: Feature): Access | undefined =>
  me.is_admin ? 'WRITE' : me.access[feature]

export function permissionHandlers(
  world: PermissionsWorld,
  getMe: () => Me,
  latency: () => Promise<void>,
) {
  const API = '*/api/v1/admin/permissions'
  const write = () => {
    const me = getMe()
    return me.is_admin || me.access['admin.permissions'] === 'WRITE'
  }
  const read = () => {
    const me = getMe()
    return me.is_admin || me.access['admin.permissions'] !== undefined
  }
  const exceeds = (grants: FeatureGrant[]) =>
    grants.some(({ feature, level }) => RANK[level] > rank(callerLevel(getMe(), feature)))
  const record = (entry: Omit<AuditEntry, 'id' | 'actor_sub' | 'created_at'>) =>
    world.audit.unshift({
      ...entry,
      id: world.audit.length + 1,
      actor_sub: getMe().sub,
      created_at: new Date().toISOString(),
    })
  const userRead = (sub: string): Schemas['UserPermissionsRead'] => {
    const user = world.users.get(sub) ?? { roles: [], grants: [] }
    const effective: Record<string, Access> = {}
    const lift = (feature: string, level: Access) => {
      if (!effective[feature] || RANK[level] > RANK[effective[feature]]) effective[feature] = level
    }
    const grants = [
      ...user.grants,
      ...user.roles.flatMap((name) => world.roles.find((role) => role.name === name)?.grants ?? []),
    ]
    for (const { feature, level } of grants) lift(feature, level)
    return { sub, roles: user.roles, grants: user.grants, effective }
  }
  const userOf = (sub: string) => {
    const existing = world.users.get(sub)
    if (existing) return existing
    const created = { roles: [] as string[], grants: [] as FeatureGrant[] }
    world.users.set(sub, created)
    return created
  }

  return [
    http.get(`${API}/features`, async () => {
      await latency()
      return read() ? HttpResponse.json(world.features) : forbidden()
    }),
    http.get(`${API}/roles`, async () => {
      await latency()
      return read() ? HttpResponse.json(world.roles) : forbidden()
    }),
    http.post(`${API}/roles`, async ({ request }) => {
      await latency()
      if (!write()) return forbidden()
      const body = (await request.json()) as Schemas['RoleCreate']
      if (world.roles.some((role) => role.name === body.name)) {
        return HttpResponse.json({ detail: 'Rola o tej nazwie już istnieje' }, { status: 409 })
      }
      if (exceeds(body.grants ?? [])) return tooMuch()
      const created: Role = {
        name: body.name,
        description: body.description ?? '',
        is_system: false,
        grants: body.grants ?? [],
      }
      world.roles.push(created)
      record({ action: 'role.create', target_sub: null, target_role: created.name, change: {} })
      return HttpResponse.json(created, { status: 201 })
    }),
    http.put(`${API}/roles/:name`, async ({ params, request }) => {
      await latency()
      if (!write()) return forbidden()
      const role = world.roles.find((candidate) => candidate.name === params.name)
      if (!role) return notFound('Role not found')
      if (role.name === 'superadmin') return forbidden()
      const body = (await request.json()) as Schemas['RoleUpdate']
      if (
        exceeds(
          body.grants.filter(
            (grant) =>
              !role.grants.some(
                (held) => held.feature === grant.feature && held.level === grant.level,
              ),
          ),
        )
      )
        return tooMuch()
      role.description = body.description ?? ''
      role.grants = body.grants
      record({ action: 'role.update', target_sub: null, target_role: role.name, change: {} })
      return HttpResponse.json(role)
    }),
    http.delete(`${API}/roles/:name`, async ({ params }) => {
      await latency()
      if (!write()) return forbidden()
      const role = world.roles.find((candidate) => candidate.name === params.name)
      if (!role) return notFound('Role not found')
      if (role.is_system) return forbidden()
      world.roles = world.roles.filter((candidate) => candidate !== role)
      for (const user of world.users.values())
        user.roles = user.roles.filter((r) => r !== role.name)
      record({ action: 'role.delete', target_sub: null, target_role: role.name, change: {} })
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${API}/users`, async () => {
      await latency()
      return read() ? HttpResponse.json([...world.users.keys()].sort()) : forbidden()
    }),
    http.get(`${API}/users/:sub`, async ({ params }) => {
      await latency()
      return read()
        ? HttpResponse.json(userRead(decodeURIComponent(String(params.sub))))
        : forbidden()
    }),
    http.put(`${API}/users/:sub/roles/:role`, async ({ params }) => {
      await latency()
      if (!write()) return forbidden()
      const sub = decodeURIComponent(String(params.sub))
      const role = world.roles.find((candidate) => candidate.name === params.role)
      if (!role) return notFound('Role not found')
      if (role.name === 'superadmin' || exceeds(role.grants)) return tooMuch()
      const user = userOf(sub)
      if (!user.roles.includes(role.name)) user.roles.push(role.name)
      record({ action: 'user.role.assign', target_sub: sub, target_role: role.name, change: {} })
      return HttpResponse.json(userRead(sub))
    }),
    http.delete(`${API}/users/:sub/roles/:role`, async ({ params }) => {
      await latency()
      if (!write()) return forbidden()
      const sub = decodeURIComponent(String(params.sub))
      const user = userOf(sub)
      user.roles = user.roles.filter((role) => role !== params.role)
      record({
        action: 'user.role.revoke',
        target_sub: sub,
        target_role: String(params.role),
        change: {},
      })
      return HttpResponse.json(userRead(sub))
    }),
    http.put(`${API}/users/:sub/grants/:feature`, async ({ params, request }) => {
      await latency()
      if (!write()) return forbidden()
      const sub = decodeURIComponent(String(params.sub))
      const feature = params.feature as Feature
      const { level } = (await request.json()) as Schemas['DirectGrantSet']
      if (exceeds([{ feature, level }])) return tooMuch()
      const user = userOf(sub)
      user.grants = [
        ...user.grants.filter((grant) => grant.feature !== feature),
        { feature, level },
      ]
      record({
        action: 'user.grant.set',
        target_sub: sub,
        target_role: null,
        change: { feature, level },
      })
      return HttpResponse.json(userRead(sub))
    }),
    http.delete(`${API}/users/:sub/grants/:feature`, async ({ params }) => {
      await latency()
      if (!write()) return forbidden()
      const sub = decodeURIComponent(String(params.sub))
      const user = userOf(sub)
      user.grants = user.grants.filter((grant) => grant.feature !== params.feature)
      record({
        action: 'user.grant.revoke',
        target_sub: sub,
        target_role: null,
        change: { feature: String(params.feature) },
      })
      return HttpResponse.json(userRead(sub))
    }),
    http.get(`${API}/audit`, async ({ request }) => {
      await latency()
      if (!read()) return forbidden()
      const sub = new URL(request.url).searchParams.get('sub')
      return HttpResponse.json(world.audit.filter((entry) => !sub || entry.target_sub === sub))
    }),
  ]
}
