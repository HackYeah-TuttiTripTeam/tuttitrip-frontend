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

export interface VoiceView {
  captions: Caption[]
  /** The assistant's voice is playing. */
  speaking: boolean
}

export const EMPTY_VOICE_VIEW: VoiceView = { captions: [], speaking: false }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const ASSISTANT_DELTA = [
  'response.output_audio_transcript.delta',
  'response.audio_transcript.delta',
]
const ASSISTANT_DONE = ['response.output_audio_transcript.done', 'response.audio_transcript.done']
const ITEM_ADDED = ['conversation.item.added', 'conversation.item.created']

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
  if (type === 'output_audio_buffer.started') return { ...view, speaking: true }
  if (type === 'output_audio_buffer.stopped' || type === 'output_audio_buffer.cleared') {
    return { ...view, speaking: false }
  }
  return view
}

/** Captions without text (an item still waiting for its transcript) are not shown. */
export const visibleCaptions = (captions: readonly Caption[]) =>
  captions.filter((caption) => caption.text.trim() !== '')
