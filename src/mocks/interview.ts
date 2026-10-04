import { delay, HttpResponse, http } from 'msw'
import type { Schemas } from '@/api/client'
import type { InterviewCard } from '@/lib/interview'
import { profile, type Trip, trip } from './fixtures'

type Knowledge = Schemas['KnowledgeRead']
type FieldRef = Schemas['FieldRef']
type FieldSource = Schemas['FieldSource']
type Message = { role: 'user' | 'assistant'; text: string }

export const SESSION_ID = '5e8a9b52-1c7d-4f40-9a66-2d3e4f5a6b01'
const SESSION_TIME = '2026-10-04T09:00:00Z'

/** The part of a scenario's world the interview reads and changes (`World` satisfies it). */
export interface InterviewHost {
  trips: Trip[]
  profiles: Schemas['ProfileRead'][]
  preferences: Schemas['PreferencesRead'][]
  interview: InterviewWorld
}

/** One answer of the scripted assistant: what it says, what it writes down, what it asks next. */
export interface ScriptedTurn {
  reply: string
  /** Names of the tools the assistant calls this turn (shown as "saving data"). */
  tools?: string[]
  /** Changes the world like the tools of the real assistant would. */
  effect?: (world: InterviewHost) => void
  card?: InterviewCard | null
}

/** The interview's slice of a scenario. */
export interface InterviewWorld {
  /** Null until the first sentence (or a scenario that starts with a conversation). */
  started: boolean
  messages: Message[]
  /** What the assistant wrote, to tell a value it set from one the host corrected. */
  written: { destination?: string | null; dates?: string; budget?: string }
  script: ScriptedTurn[]
  turn: number
  /** A run answers with this status instead of a stream (401 expired session, 409 run going). */
  runStatus?: number
  /** The stream is cut after this many events, like a dropped connection. */
  cutAfter?: number
}

export const emptyInterviewWorld = (): InterviewWorld => ({
  started: false,
  messages: [],
  written: {},
  script: defaultScript(),
  turn: 0,
})

export const resumedMessages = (count: number): Message[] =>
  Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    text: index % 2 === 0 ? `Pytanie ${index + 1}` : `Odpowiedź ${index + 1}`,
  }))

export const SWIPE_OPTIONS = ['Muzeum Bursztynu', 'Zamek w Malborku']
export const TOGGLE_OPTIONS = ['Basen w każdym noclegu', 'Tylko Airbnb', 'Jedna noc w zamku']

/** The conversation of the demo: the first sentence, then one card of each kind. */
function defaultScript(): ScriptedTurn[] {
  return [
    {
      reply: 'Gdańsk na trzy dni, super. Zapisałem cel i daty. Jaki macie budżet?',
      tools: ['set_trip_basics', 'add_person'],
      effect: (world) => {
        const main = world.trips[0]
        if (!main) return
        Object.assign(main, {
          destination: 'Gdańsk',
          start_date: '2026-10-16',
          end_date: '2026-10-18',
        })
        world.interview.written.destination = 'Gdańsk'
        world.interview.written.dates = '2026-10-16/2026-10-18'
        world.profiles.push(profile(crypto.randomUUID(), 'Kasia', 6, 'child'))
      },
      card: { kind: 'budget_range', question: 'Ile chcecie wydać?', options: ['PLN'] },
    },
    {
      reply: 'Zapisane. Teraz kilka miejsc.',
      tools: ['set_budget'],
      effect: (world) => {
        const main = world.trips[0]
        if (!main) return
        Object.assign(main, { budget_total_min: '2000.00', budget_total_max: '3000.00' })
        world.interview.written.budget = '2000/3000'
      },
      card: { kind: 'swipe', question: 'Taki klimat?', options: SWIPE_OPTIONS },
    },
    {
      reply: 'Dobrze. Czego potrzebujecie w noclegu?',
      card: { kind: 'requirement_toggles', question: 'Wymagania', options: TOGGLE_OPTIONS },
    },
    {
      reply: 'Rozdzielcie ważność.',
      card: { kind: 'dot_pool', question: 'Co jest dla Was ważne?', options: [] },
    },
    {
      reply: 'Kto jedzie?',
      card: { kind: 'family_builder', question: 'Skład rodziny', options: [] },
    },
    {
      reply: 'Jeszcze tempo.',
      card: {
        kind: 'slider',
        question: 'Jakie tempo zwiedzania?',
        options: ['Spokojnie', 'Intensywnie'],
      },
    },
    {
      reply: 'To wszystko. Zbudować plan?',
      card: { kind: 'confirm', question: 'Zbudować plan?', options: ['Tak, buduj', 'Jeszcze nie'] },
    },
  ]
}

const dateKey = (current: Trip) => `${current.start_date}/${current.end_date}`
const budgetKey = (current: Trip) =>
  `${Number(current.budget_total_min)}/${Number(current.budget_total_max)}`

/** The "What we already know" view the API builds from trips and profiles. */
export function knowledgeOf(world: InterviewHost, current: Trip): Knowledge {
  const people = world.profiles.filter((p) => p.trip_id === current.id)
  const preferences = people.map(
    (p) =>
      world.preferences.find((pref) => pref.profile_id === p.id) ?? {
        profile_id: p.id,
        filled: false,
      },
  ) as Knowledge['preferences']
  const written = world.interview.written
  const sourceOf = (written_: string | null | undefined, now: string): 'assistant' | 'host' =>
    written_ !== undefined && written_ !== null && written_ !== now ? 'host' : 'assistant'

  const sources: FieldSource[] = []
  const missing: FieldRef[] = []
  if (current.destination) {
    sources.push({
      field: 'destination',
      source:
        written.destination !== undefined && written.destination !== current.destination
          ? 'host'
          : 'assistant',
    })
  } else missing.push({ field: 'destination' })
  if (current.start_date && current.end_date) {
    sources.push({ field: 'dates', source: sourceOf(written.dates, dateKey(current)) })
  } else missing.push({ field: 'dates' })
  if (current.budget_total_min !== null || current.budget_day_min !== null) {
    sources.push({ field: 'budget', source: sourceOf(written.budget, budgetKey(current)) })
  } else missing.push({ field: 'budget' })
  for (const person of people) {
    sources.push({ field: 'people', profile_id: person.id, source: 'assistant' })
  }
  for (const pref of preferences) {
    if (pref.filled)
      sources.push({ field: 'preferences', profile_id: pref.profile_id, source: 'assistant' })
    else missing.push({ field: 'preferences', profile_id: pref.profile_id })
  }
  if (people.length < 2) missing.push({ field: 'people' })
  return { trip: current, people, preferences, missing, sources }
}

const encoder = new TextEncoder()
const frame = (event: object) => encoder.encode(`data: ${JSON.stringify(event)}\n\n`)

/** The AG-UI events of one scripted turn, for a `HttpAgent` to read. */
export function turnEvents(
  world: InterviewHost,
  current: Trip,
  turn: ScriptedTurn,
  threadId: string,
) {
  const runId = crypto.randomUUID()
  const messageId = crypto.randomUUID()
  const events: object[] = [{ type: 'RUN_STARTED', threadId, runId }]
  const reasoningId = crypto.randomUUID()
  events.push(
    { type: 'REASONING_START', messageId: reasoningId },
    { type: 'REASONING_MESSAGE_START', messageId: reasoningId, role: 'reasoning' },
    {
      type: 'REASONING_MESSAGE_CONTENT',
      messageId: reasoningId,
      delta: 'Sprawdzam, czego brakuje.',
    },
    { type: 'REASONING_MESSAGE_END', messageId: reasoningId },
    { type: 'REASONING_END', messageId: reasoningId },
  )
  for (const name of turn.tools ?? []) {
    const toolCallId = crypto.randomUUID()
    events.push(
      { type: 'TOOL_CALL_START', toolCallId, toolCallName: name, parentMessageId: messageId },
      { type: 'TOOL_CALL_ARGS', toolCallId, delta: '{}' },
      { type: 'TOOL_CALL_END', toolCallId },
      {
        type: 'TOOL_CALL_RESULT',
        messageId: crypto.randomUUID(),
        toolCallId,
        content: 'ok',
        role: 'tool',
      },
    )
  }
  turn.effect?.(world)
  const after = world.trips.find((candidate) => candidate.id === current.id) ?? current
  events.push({ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' })
  for (const word of turn.reply.split(/(?<= )/)) {
    events.push({ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: word })
  }
  events.push(
    { type: 'TEXT_MESSAGE_END', messageId },
    {
      type: 'STATE_SNAPSHOT',
      snapshot: { knowledge: knowledgeOf(world, after), card: turn.card ?? null },
    },
    { type: 'RUN_FINISHED', threadId, runId },
  )
  return events
}

/** A server-sent-events response made of the given events (also for tests that script their own). */
export function sseResponse(events: object[], gapMs = 0, cutAfter?: number) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const [index, event] of events.entries()) {
        if (cutAfter !== undefined && index >= cutAfter) {
          controller.error(new TypeError('network error'))
          return
        }
        if (gapMs > 0) await delay(gapMs)
        controller.enqueue(frame(event))
      }
      controller.close()
    },
  })
  return new HttpResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' },
  })
}

function sessionRead(world: InterviewHost, tripId: string): Schemas['SessionRead'] {
  return {
    id: SESSION_ID,
    trip_id: tripId,
    status: 'open',
    created_by: 'auth0|mock-user',
    created_at: SESSION_TIME,
    updated_at: SESSION_TIME,
    message_count: world.interview.messages.length,
  }
}

interface InterviewHandlerEnv {
  api: string
  world: InterviewHost
  latency: () => Promise<void>
  gapMs: number
  findTrip: (id: unknown) => Trip | undefined
  canWrite: (id: unknown) => boolean
}

/** The interview endpoints: session, knowledge and the AG-UI stream. */
export function interviewHandlers({
  api,
  world,
  latency,
  gapMs,
  findTrip,
  canWrite,
}: InterviewHandlerEnv) {
  const guard = (tripId: unknown) => {
    const found = findTrip(tripId)
    if (!found) return HttpResponse.json({ detail: 'Trip not found' }, { status: 404 })
    if (!canWrite(tripId)) return HttpResponse.json({ detail: 'Brak uprawnienia' }, { status: 403 })
    return found
  }
  return [
    http.post(`${api}/trips/:tripId/interview/sessions`, async ({ params }) => {
      await latency()
      const found = guard(params.tripId)
      if (found instanceof HttpResponse) return found
      const created = !world.interview.started
      world.interview.started = true
      return HttpResponse.json(sessionRead(world, found.id), { status: created ? 201 : 200 })
    }),

    http.get(`${api}/trips/:tripId/interview/sessions/current`, async ({ params, request }) => {
      await latency()
      const found = guard(params.tripId)
      if (found instanceof HttpResponse) return found
      if (!world.interview.started) {
        return HttpResponse.json(
          { detail: 'The trip has no open interview session' },
          { status: 404 },
        )
      }
      const url = new URL(request.url)
      const size = Number(url.searchParams.get('size') ?? '50')
      const page = Number(url.searchParams.get('page') ?? '1')
      const desc = url.searchParams.get('dir') === 'desc'
      const all = world.interview.messages.map((message, position) => ({
        position,
        role: message.role,
        text: message.text,
        timestamp: SESSION_TIME,
      }))
      const ordered = desc ? [...all].reverse() : all
      const items = ordered.slice((page - 1) * size, page * size)
      return HttpResponse.json({
        ...sessionRead(world, found.id),
        messages: { items, total: all.length, page, size, pages: Math.ceil(all.length / size) },
      })
    }),

    http.get(`${api}/trips/:tripId/interview/knowledge`, async ({ params }) => {
      await latency()
      const found = guard(params.tripId)
      if (found instanceof HttpResponse) return found
      return HttpResponse.json(knowledgeOf(world, found))
    }),

    http.post(`${api}/trips/:tripId/interview/agui`, async ({ params, request }) => {
      await latency()
      const found = guard(params.tripId)
      if (found instanceof HttpResponse) return found
      if (world.interview.runStatus) {
        return HttpResponse.json({ detail: 'mock' }, { status: world.interview.runStatus })
      }
      const input = (await request.json()) as { messages?: { role: string; content?: unknown }[] }
      const last = input.messages?.filter((message) => message.role === 'user').at(-1)
      if (typeof last?.content === 'string') {
        world.interview.messages.push({ role: 'user', text: last.content })
      }
      const turn = world.interview.script[world.interview.turn] ?? {
        reply: 'Dziękuję, mam wszystko.',
        card: null,
      }
      world.interview.turn += 1
      world.interview.messages.push({ role: 'assistant', text: turn.reply })
      return sseResponse(
        turnEvents(world, found, turn, SESSION_ID),
        gapMs,
        world.interview.cutAfter,
      )
    }),
  ]
}

export const emptyTrip = (): Trip =>
  trip({
    destination: null,
    start_date: null,
    end_date: null,
    city_slug: null,
    currency: null,
    budget_total_min: null,
    budget_total_max: null,
  })
