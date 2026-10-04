import { z } from 'zod'
import type { Access, FeatureGrant, FeatureNode, Me } from '@/api/queries/permissions'
import { m } from '@/paraglide/messages'

/** The role that comes from Auth0 only; the app never edits it or hands it out. */
export const SUPERADMIN_ROLE = 'superadmin'
export const isLockedRole = (name: string) => name === SUPERADMIN_ROLE

export type Level = Access | 'NONE'
export const LEVELS: readonly Level[] = ['NONE', 'READ', 'WRITE']

const RANK: Record<Level, number> = { NONE: 0, READ: 1, WRITE: 2 }
export const atLeast = (have: Level, need: Level) => RANK[have] >= RANK[need]

/** What the signed-in person may do in this panel, read from the API's answer, never guessed. */
export function panelAccess(me: Me | undefined): Level {
  if (!me) return 'NONE'
  if (me.is_admin) return 'WRITE'
  return me.access['admin.permissions'] ?? 'NONE'
}

export type Feature = FeatureNode['code']
export type Grants = ReadonlyMap<Feature, Access>

export const grantsToMap = (grants: readonly FeatureGrant[]): Grants =>
  new Map(grants.map((grant) => [grant.feature, grant.level]))

export const mapToGrants = (grants: Grants): FeatureGrant[] =>
  [...grants]
    .map(([feature, level]): FeatureGrant => ({ feature, level }))
    .sort((a, b) => a.feature.localeCompare(b.feature))

export function withLevel(grants: Grants, feature: Feature, level: Level): Grants {
  const next = new Map(grants)
  if (level === 'NONE') next.delete(feature)
  else next.set(feature, level)
  return next
}

export interface FeatureRow {
  code: Feature
  description: string
  depth: number
  /** Codes from the root down to the parent; a grant on any of them covers this feature. */
  ancestors: Feature[]
}

/** The tree as a flat list in reading order. */
export function flattenFeatures(node: FeatureNode, ancestors: Feature[] = []): FeatureRow[] {
  return [
    { code: node.code, description: node.description, depth: ancestors.length, ancestors },
    ...(node.children ?? []).flatMap((child) => flattenFeatures(child, [...ancestors, node.code])),
  ]
}

/** The strongest grant on an ancestor: what a feature gets without a grant of its own. */
export function inheritedLevel(
  row: FeatureRow,
  grants: Grants,
): { from: Feature; level: Access } | null {
  let found: { from: Feature; level: Access } | null = null
  for (const code of row.ancestors) {
    const level = grants.get(code)
    if (level && (!found || RANK[level] > RANK[found.level])) found = { from: code, level }
  }
  return found
}

/** The API's `detail` when it is a sentence (403 "more than you have"), else nothing. */
export function detailMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('detail' in error)) return undefined
  return typeof error.detail === 'string' ? error.detail : undefined
}

export interface ClientPage<T> {
  items: T[]
  total: number
  pages: number
}

/** Paging for lists the API returns whole: the same page/size contract as the server-paged ones. */
export function pageOf<T>(all: readonly T[], page: number, size: number): ClientPage<T> {
  const pages = Math.ceil(all.length / size)
  const start = (Math.min(page, Math.max(pages, 1)) - 1) * size
  return { items: all.slice(start, start + size), total: all.length, pages }
}

/** Same rules as the API's RoleCreate/RoleUpdate, so a typo is caught before the request. */
export const roleFormSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]{1,49}$/, {
    error: () => m.perm_role_name_invalid(),
  }),
  description: z.string().max(500, { error: () => m.perm_role_text_too_long() }),
})
export type RoleFormValues = z.infer<typeof roleFormSchema>
