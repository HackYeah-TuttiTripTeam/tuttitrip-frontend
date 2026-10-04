import { HttpResponse, http, type RequestHandler } from 'msw'
import { rainReplan, type Trip } from './fixtures'
import type { World } from './scenarios'

const API = '*/api/v1'

/** The rain button and the host's approvals (backend #74): a member's change waits for the host. */
export function replanHandlers(
  world: World,
  latency: () => Promise<void>,
  findTrip: (id: unknown) => Trip | undefined,
): RequestHandler[] {
  const isManager = (id: unknown) => findTrip(id)?.my_role !== 'member'
  const find = (id: unknown) => world.replans.find((replan) => replan.id === id)
  const decide =
    (status: 'active' | 'rejected') =>
    async ({ params }: { params: Record<string, unknown> }) => {
      await latency()
      if (!isManager(params.tripId))
        return HttpResponse.json({ detail: 'Forbidden' }, { status: 403 })
      const current = find(params.replanId)
      if (!current) return HttpResponse.json({ detail: 'Replan not found' }, { status: 404 })
      current.status = status
      return HttpResponse.json(current)
    }

  return [
    http.post(`${API}/trips/:tripId/plans/:planId/replan`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId) || !world.plan) {
        return HttpResponse.json({ detail: 'Plan not found' }, { status: 404 })
      }
      const body = (await request.json()) as { day: number }
      const manager = isManager(params.tripId)
      const created = rainReplan(world.plan, body.day, manager ? 'active' : 'pending_host', 'Ola')
      world.replans.unshift(created)
      return HttpResponse.json(created)
    }),

    http.get(`${API}/trips/:tripId/replans`, async ({ params, request }) => {
      await latency()
      if (!isManager(params.tripId))
        return HttpResponse.json({ detail: 'Forbidden' }, { status: 403 })
      const wanted = new URL(request.url).searchParams.get('status')
      const items = world.replans.filter((replan) => !wanted || replan.status === wanted)
      return HttpResponse.json({ items, total: items.length })
    }),

    http.post(`${API}/trips/:tripId/replans/:replanId/approve`, decide('active')),
    http.post(`${API}/trips/:tripId/replans/:replanId/reject`, decide('rejected')),
  ]
}
