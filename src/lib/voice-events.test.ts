import { describe, expect, it } from 'vitest'
import { applyRealtimeEvent, EMPTY_VOICE_VIEW, visibleCaptions } from './voice-events'

const fold = (events: unknown[]) => events.reduce(applyRealtimeEvent, EMPTY_VOICE_VIEW)
const texts = (view: { captions: { role: string; text: string }[] }) =>
  visibleCaptions(view.captions as never).map((caption) => `${caption.role}: ${caption.text}`)

describe('applyRealtimeEvent', () => {
  it('builds the assistant caption from deltas and settles it on done (GA names)', () => {
    const view = fold([
      { type: 'conversation.item.added', item: { id: 'a1', role: 'assistant' } },
      { type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Cześć, ' },
      { type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'dokąd?' },
    ])
    expect(texts(view)).toEqual(['assistant: Cześć, dokąd?'])
    expect(view.captions[0]?.final).toBe(false)
    const done = applyRealtimeEvent(view, {
      type: 'response.output_audio_transcript.done',
      item_id: 'a1',
      transcript: 'Cześć, dokąd jedziecie?',
    })
    expect(texts(done)).toEqual(['assistant: Cześć, dokąd jedziecie?'])
    expect(done.captions[0]?.final).toBe(true)
  })

  it('reads the beta event names too', () => {
    const view = fold([
      { type: 'response.audio_transcript.delta', item_id: 'a1', delta: 'Hej' },
      { type: 'response.audio_transcript.done', item_id: 'a1', transcript: 'Hej!' },
    ])
    expect(texts(view)).toEqual(['assistant: Hej!'])
  })

  it('keeps the spoken order when the user transcript comes after the answer', () => {
    const view = fold([
      { type: 'conversation.item.added', item: { id: 'u1', role: 'user' } },
      {
        type: 'conversation.item.added',
        previous_item_id: 'u1',
        item: { id: 'a1', role: 'assistant' },
      },
      {
        type: 'response.output_audio_transcript.done',
        item_id: 'a1',
        transcript: 'Gdańsk, jasne.',
      },
      {
        type: 'conversation.item.input_audio_transcription.completed',
        item_id: 'u1',
        transcript: ' Gdańsk, trzy dni ',
      },
    ])
    expect(texts(view)).toEqual(['user: Gdańsk, trzy dni', 'assistant: Gdańsk, jasne.'])
  })

  it('hides an item that has no transcript yet', () => {
    const view = fold([{ type: 'conversation.item.added', item: { id: 'u1', role: 'user' } }])
    expect(texts(view)).toEqual([])
  })

  it('follows the assistant voice and ignores events it does not know', () => {
    let view = applyRealtimeEvent(EMPTY_VOICE_VIEW, { type: 'output_audio_buffer.started' })
    expect(view.speaking).toBe(true)
    view = applyRealtimeEvent(view, { type: 'output_audio_buffer.stopped' })
    expect(view.speaking).toBe(false)
    expect(applyRealtimeEvent(view, { type: 'rate_limits.updated' })).toBe(view)
    expect(applyRealtimeEvent(view, 'nonsense')).toBe(view)
  })
})
