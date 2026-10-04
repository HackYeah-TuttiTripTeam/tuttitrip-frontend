// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { SESSION_ID, sseResponse } from '@/mocks/interview'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const AGUI = '*/api/v1/trips/:tripId/interview/agui'
const SENTENCE = 'Gdańsk, trzy dni, dzieci 6 i 13 lat, babcia'

/** The messages of every agent run the browser started, in order. */
function recordRuns() {
  const runs: { messages: { role: string; content: string }[]; threadId: string }[] = []
  server.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/interview/agui')) {
      runs.push(await request.clone().json())
    }
  })
  return runs
}

const openInterview = () => renderApp(`/trips/${TRIP_ID}?tab=interview`)

async function sendFirstSentence(text = SENTENCE) {
  const user = userEvent.setup()
  openInterview()
  const field = await screen.findByRole('textbox', { name: m.interview_first_label() })
  await user.type(field, text)
  await user.click(screen.getByRole('button', { name: m.interview_first_submit() }))
  return user
}

describe('Wywiad, pierwsze zdanie', () => {
  it('shows the first-sentence field for a trip without a session', async () => {
    useScenario('interview-empty')
    openInterview()
    expect(await screen.findByRole('textbox', { name: m.interview_first_label() })).toBeTruthy()
    expect((await screen.findAllByText(m.interview_panel_not_set())).length).toBeGreaterThan(0)
  })

  it('streams the assistant reply and shows the next card, sending only the latest text', async () => {
    useScenario('interview-empty')
    const runs = recordRuns()
    await sendFirstSentence()

    const thread = await screen.findByRole('list', { name: m.interview_thread_label() })
    expect(await within(thread).findByText(/Gdańsk na trzy dni, super/)).toBeTruthy()
    expect(within(thread).getByText(SENTENCE)).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Ile chcecie wydać?' })).toBeTruthy()

    expect(runs).toHaveLength(1)
    expect(runs[0]?.threadId).toBe(SESSION_ID)
    expect(runs[0]?.messages.map((message) => message.content)).toEqual([SENTENCE])
  })

  it('fills the "What I know" panel from the tool snapshot and marks who set it', async () => {
    useScenario('interview-empty')
    await sendFirstSentence()
    const panel = await screen.findByRole('complementary', { name: m.interview_panel_title() })
    expect(await within(panel).findByText('Gdańsk')).toBeTruthy()
    expect(within(panel).getAllByText(m.interview_source_assistant()).length).toBeGreaterThan(0)
    // The person the tool added shows up without a reload.
    expect((await within(panel).findAllByText('Kasia')).length).toBeGreaterThan(0)
    expect(within(panel).getByText(m.interview_panel_age({ age: 6 }))).toBeTruthy()
    expect(within(panel).getAllByText(m.interview_missing_budget()).length).toBeGreaterThan(0)
  })

  it('answers the budget card with both numbers in the next run', async () => {
    useScenario('interview-empty')
    const runs = recordRuns()
    const user = await sendFirstSentence()
    await screen.findByRole('heading', { name: 'Ile chcecie wydać?' })
    await user.click(screen.getByRole('button', { name: m.interview_card_submit() }))
    await waitFor(() => expect(runs).toHaveLength(2))
    expect(runs[1]?.messages.map((message) => message.content)).toEqual([
      m.interview_answer_budget({ from: 2000, to: 3000, currency: 'PLN' }),
    ])
    // The next card is the swipe deck.
    expect(await screen.findByRole('heading', { name: 'Taki klimat?' })).toBeTruthy()
  })
})

describe('Wywiad, błędy', () => {
  it('asks to sign in again when the session ran out, keeping the message', async () => {
    useScenario('interview-empty', {
      tweak: (world) => {
        world.interview.runStatus = 401
      },
    })
    await sendFirstSentence()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(m.interview_error_auth())
    expect(screen.getByRole('button', { name: m.interview_login_again() })).toBeTruthy()
    expect(screen.getByText(SENTENCE)).toBeTruthy()
  })

  it('says a run is already going on 409', async () => {
    useScenario('interview-empty', {
      tweak: (world) => {
        world.interview.runStatus = 409
      },
    })
    await sendFirstSentence()
    expect((await screen.findByRole('alert')).textContent).toContain(m.interview_error_busy())
  })

  it('offers "Try again" after a stream cut off, and the message stays', async () => {
    useScenario('interview-empty', {
      tweak: (world) => {
        world.interview.cutAfter = 4
      },
    })
    const user = await sendFirstSentence()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(m.interview_error_offline())
    expect(screen.getByText(SENTENCE)).toBeTruthy()

    // The connection is back: the same message goes out again and the reply arrives.
    server.use(
      http.post(AGUI, () =>
        sseResponse([
          { type: 'RUN_STARTED', threadId: SESSION_ID, runId: 'r2' },
          { type: 'TEXT_MESSAGE_START', messageId: 'a2', role: 'assistant' },
          { type: 'TEXT_MESSAGE_CONTENT', messageId: 'a2', delta: 'Już jestem.' },
          { type: 'TEXT_MESSAGE_END', messageId: 'a2' },
          { type: 'RUN_FINISHED', threadId: SESSION_ID, runId: 'r2' },
        ]),
      ),
    )
    await user.click(within(alert).getByRole('button', { name: m.action_retry() }))
    expect(await screen.findByText('Już jestem.')).toBeTruthy()
    expect(screen.getAllByText(SENTENCE)).toHaveLength(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a RUN_ERROR of the stream as a failed run', async () => {
    useScenario('interview-empty')
    server.use(
      http.post(AGUI, () =>
        sseResponse([
          { type: 'RUN_STARTED', threadId: SESSION_ID, runId: 'r1' },
          { type: 'RUN_ERROR', message: 'Budżet wyczerpany' },
        ]),
      ),
    )
    await sendFirstSentence()
    expect((await screen.findByRole('alert')).textContent).toContain(m.interview_error_failed())
  })
})

describe('Wywiad, historia', () => {
  it('shows the newest page in reading order and loads earlier messages on request', async () => {
    useScenario('interview-resumed')
    const user = userEvent.setup()
    openInterview()
    const thread = await screen.findByRole('list', { name: m.interview_thread_label() })
    const texts = () =>
      within(thread)
        .getAllByRole('listitem')
        .map((item) => item.textContent ?? '')
    await waitFor(() => expect(texts()).toHaveLength(30))
    expect(texts()[0]).toContain('Pytanie 11')
    expect(texts().at(-1)).toContain('Odpowiedź 40')

    await user.click(screen.getByRole('button', { name: m.interview_earlier() }))
    await waitFor(() => expect(texts()).toHaveLength(40))
    expect(texts()[0]).toContain('Pytanie 1')
    expect(screen.queryByRole('button', { name: m.interview_earlier() })).toBeNull()
  })

  it('keeps the session in the composer after the first run', async () => {
    useScenario('interview-resumed')
    const runs = recordRuns()
    const user = userEvent.setup()
    openInterview()
    const field = await screen.findByRole('textbox', { name: m.interview_composer_label() })
    await user.type(field, 'Dodaj muzea')
    await user.click(screen.getByRole('button', { name: m.interview_send() }))
    await waitFor(() => expect(runs).toHaveLength(1))
    expect(runs[0]?.messages.map((message) => message.content)).toEqual(['Dodaj muzea'])
    expect(runs[0]?.threadId).toBe(SESSION_ID)
  })
})

describe('Wywiad, członek', () => {
  it('tells a plain member that the host runs the interview', async () => {
    useScenario('member-readonly')
    openInterview()
    expect(await screen.findByText(m.interview_members_title())).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('Co już wiem, edycja w obie strony', () => {
  it('saves a correction through the trips API and marks it as corrected', async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        world.interview.written.destination = 'Warszawa'
      },
    })
    const user = userEvent.setup()
    openInterview()
    const panel = await screen.findByRole('complementary', { name: m.interview_panel_title() })
    expect(await within(panel).findByText('Warszawa')).toBeTruthy()
    expect(within(panel).queryByText(m.interview_source_host())).toBeNull()

    await user.click(
      within(panel).getByRole('button', {
        name: m.interview_panel_edit({ field: m.interview_panel_destination() }),
      }),
    )
    const dialog = await screen.findByRole('dialog')
    const field = within(dialog).getByLabelText(m.trip_form_destination_label())
    await user.clear(field)
    await user.type(field, 'Sopot')
    await user.click(within(dialog).getByRole('button', { name: m.trip_settings_save() }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await within(panel).findByText('Sopot')).toBeTruthy()
    expect(within(panel).getByText(m.interview_source_host())).toBeTruthy()
  })

  it('shows the missing fields in Polish', async () => {
    useScenario('interview-empty')
    openInterview()
    const panel = await screen.findByRole('complementary', { name: m.interview_panel_title() })
    const missing = await within(panel).findByRole('heading', { name: m.interview_panel_missing() })
    const list = missing.closest('section') as HTMLElement
    expect(within(list).getByText(m.interview_missing_destination())).toBeTruthy()
    expect(within(list).getByText(m.interview_missing_dates())).toBeTruthy()
    expect(within(list).getByText(m.interview_missing_people())).toBeTruthy()
  })

  it('opens on a phone from the bottom bar with the count of collected values', async () => {
    useScenario('interview-resumed')
    const user = userEvent.setup()
    openInterview()
    const button = await screen.findByRole('button', { name: /Co już wiem \(\d+\)/ })
    const count = Number(/\((\d+)\)/.exec(button.textContent ?? '')?.[1])
    expect(count).toBeGreaterThan(0)
    await user.click(button)
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByRole('heading', { name: m.interview_panel_title() })).toBeTruthy()
    expect(within(drawer).getAllByText('Warszawa').length).toBeGreaterThan(0)
  })

  it('refreshes the panel from the API when the assistant has answered', async () => {
    useScenario('interview-empty')
    let reads = 0
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/interview/knowledge')) reads += 1
    })
    await sendFirstSentence()
    await screen.findByRole('heading', { name: 'Ile chcecie wydać?' })
    // One read when the tab opened, one after the run ended.
    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(2))
  })

  it('does not let a snapshot of the stream overwrite what the API says afterwards', async () => {
    useScenario('interview-empty')
    server.use(
      http.post(AGUI, () =>
        sseResponse([
          { type: 'RUN_STARTED', threadId: SESSION_ID, runId: 'r1' },
          {
            type: 'STATE_SNAPSHOT',
            snapshot: {
              knowledge: {
                trip: { ...{}, destination: 'Stare miasto' },
                people: [],
                preferences: [],
                missing: [],
                sources: [],
              },
            },
          },
          { type: 'RUN_FINISHED', threadId: SESSION_ID, runId: 'r1' },
        ]),
      ),
    )
    await sendFirstSentence()
    const panel = await screen.findByRole('complementary', { name: m.interview_panel_title() })
    // The API still has no destination, and the panel ends up showing the API, not the snapshot.
    await waitFor(() => expect(within(panel).queryByText('Stare miasto')).toBeNull())
  })
})
