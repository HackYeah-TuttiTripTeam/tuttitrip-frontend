/**
 * Captions from the provider's data-channel events (OpenAI Realtime, sideband mode). The names of
 * the GA API (`response.output_audio_transcript.*`) and of the beta one (`response.audio_transcript.*`)
 * are both read. Captions are keyed by the conversation item id, so a user transcript that arrives
 * after the assistant's answer still lands in the order the turns were spoken.
 */

export interface Caption {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** The transcript of this turn is complete (the `done` / `completed` event came). */
  final: boolean
}

/** One tool call the assistant makes during the call (saving a field, building the plan). */
export interface VoiceTool {
  callId: string
  name: string
  status: 'running' | 'done' | 'failed'
}

export interface VoiceView {
  captions: Caption[]
  /** The assistant's voice is playing. */
  speaking: boolean
  /** The microphone hears the host talking (server voice detection). */
  userSpeaking: boolean
  /** The host stopped talking and the assistant has not started its answer yet. */
  heard: boolean
  /** The assistant is producing an answer (from `response.created` to `response.done`). */
  responding: boolean
  tools: VoiceTool[]
}

export const EMPTY_VOICE_VIEW: VoiceView = {
  captions: [],
  speaking: false,
  userSpeaking: false,
  heard: false,
  responding: false,
  tools: [],
}

/** What the screen says the call is doing right now, most specific first. */
export type VoiceActivity =
  | 'saving'
  | 'building_plan'
  | 'speaking'
  | 'thinking'
  | 'hearing'
  | 'listening'

/** Tool that builds the preliminary plan; every other tool saves a field. */
export const BUILD_PLAN_TOOL = 'build_plan_now'

const isRunning = (tool: VoiceTool) => tool.status === 'running'

/** The tool the assistant is running now, if any. */
export const runningTool = (view: VoiceView) => view.tools.find(isRunning)

export function voiceActivity(view: VoiceView): VoiceActivity {
  const tool = runningTool(view)
  if (tool) return tool.name === BUILD_PLAN_TOOL ? 'building_plan' : 'saving'
  if (view.speaking) return 'speaking'
  if (view.heard || view.responding) return 'thinking'
  if (view.userSpeaking) return 'hearing'
  return 'listening'
}

/**
 * The microphone may be open when the assistant is idle. While the host's words are processed
 * (they stopped talking, the assistant thinks, runs a tool or speaks) it is muted, so the
 * assistant's own voice and room noise do not become the next turn.
 */
export const micMayBeOpen = (view: VoiceView) =>
  !(view.heard || view.responding || view.speaking || runningTool(view))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const ASSISTANT_DELTA = [
  'response.output_audio_transcript.delta',
  'response.audio_transcript.delta',
]
const ASSISTANT_DONE = ['response.output_audio_transcript.done', 'response.audio_transcript.done']
const FUNCTION_ITEM_EVENTS = [
  'conversation.item.added',
  'conversation.item.created',
  'conversation.item.done',
  'response.output_item.added',
  'response.output_item.done',
]
const ITEM_ADDED = ['conversation.item.added', 'conversation.item.created']

/** A tool answered with a refusal or an error instead of a saved value. */
const REFUSAL = /^(NOT SAVED|NOT BUILT|Rejected|Error)/

function setTool(view: VoiceView, next: VoiceTool): VoiceView {
  const known = view.tools.some((tool) => tool.callId === next.callId)
  const tools = known
    ? view.tools.map((tool) => (tool.callId === next.callId ? { ...tool, ...next } : tool))
    : [...view.tools, next]
  return { ...view, tools }
}

/** A function call of the assistant starts a tool; its output item (the sideband's answer) ends it. */
function applyFunctionItem(view: VoiceView, item: Record<string, unknown>): VoiceView {
  const callId = text(item.call_id)
  if (!callId) return view
  if (item.type === 'function_call' && text(item.name)) {
    const known = view.tools.find((tool) => tool.callId === callId)
    // A repeated `done` of a call that already got its answer must not reopen it.
    if (known && known.status !== 'running') return view
    return setTool(view, { callId, name: text(item.name), status: 'running' })
  }
  if (item.type === 'function_call_output') {
    const known = view.tools.find((tool) => tool.callId === callId)
    const failed = REFUSAL.test(text(item.output))
    return setTool(view, {
      callId,
      name: known?.name ?? '',
      status: failed ? 'failed' : 'done',
    })
  }
  return view
}

/** Puts a caption in its place: after `previousId` when the provider names it, else at the end. */
function insert(captions: Caption[], caption: Caption, previousId: string | undefined): Caption[] {
  if (captions.some((existing) => existing.id === caption.id)) return captions
  const after = previousId ? captions.findIndex((existing) => existing.id === previousId) : -1
  if (after < 0) return [...captions, caption]
  return [...captions.slice(0, after + 1), caption, ...captions.slice(after + 1)]
}

function upsert(
  captions: Caption[],
  id: string,
  role: Caption['role'],
  change: (current: string) => string,
  final: boolean,
): Caption[] {
  const found = captions.find((caption) => caption.id === id)
  if (!found) return [...captions, { id, role, text: change(''), final }]
  return captions.map((caption) =>
    caption.id === id ? { ...caption, text: change(caption.text), final } : caption,
  )
}

/** Folds one data-channel message (already parsed from JSON) into the view. Unknown events change nothing. */
export function applyRealtimeEvent(view: VoiceView, raw: unknown): VoiceView {
  if (!isRecord(raw) || typeof raw.type !== 'string') return view
  const { type } = raw
  const itemId = text(raw.item_id)

  if (
    FUNCTION_ITEM_EVENTS.includes(type) &&
    isRecord(raw.item) &&
    (raw.item.type === 'function_call' || raw.item.type === 'function_call_output')
  ) {
    return applyFunctionItem(view, raw.item)
  }
  if (ITEM_ADDED.includes(type) && isRecord(raw.item)) {
    const { id, role } = raw.item
    if (typeof id !== 'string' || (role !== 'user' && role !== 'assistant')) return view
    const previous = text(raw.previous_item_id) || undefined
    return {
      ...view,
      captions: insert(view.captions, { id, role, text: '', final: false }, previous),
    }
  }
  if (ASSISTANT_DELTA.includes(type) && itemId) {
    const delta = text(raw.delta)
    return {
      ...view,
      captions: upsert(view.captions, itemId, 'assistant', (current) => current + delta, false),
    }
  }
  if (ASSISTANT_DONE.includes(type) && itemId) {
    const transcript = text(raw.transcript)
    return {
      ...view,
      captions: upsert(
        view.captions,
        itemId,
        'assistant',
        (current) => transcript || current,
        true,
      ),
    }
  }
  if (type === 'conversation.item.input_audio_transcription.delta' && itemId) {
    const delta = text(raw.delta)
    return {
      ...view,
      captions: upsert(view.captions, itemId, 'user', (current) => current + delta, false),
    }
  }
  if (type === 'conversation.item.input_audio_transcription.completed' && itemId) {
    const transcript = text(raw.transcript).trim()
    return {
      ...view,
      captions: upsert(view.captions, itemId, 'user', (current) => transcript || current, true),
    }
  }
  if (type === 'input_audio_buffer.speech_started') {
    return { ...view, userSpeaking: true, heard: false }
  }
  if (type === 'input_audio_buffer.speech_stopped') {
    return { ...view, userSpeaking: false, heard: true }
  }
  if (type === 'response.created') return { ...view, responding: true, heard: false }
  if (type === 'response.done') return { ...view, responding: false, heard: false }
  if (type === 'output_audio_buffer.started') return { ...view, speaking: true }
  if (type === 'output_audio_buffer.stopped' || type === 'output_audio_buffer.cleared') {
    return { ...view, speaking: false }
  }
  return view
}

/** Captions without text (an item still waiting for its transcript) are not shown. */
export const visibleCaptions = (captions: readonly Caption[]) =>
  captions.filter((caption) => caption.text.trim() !== '')
