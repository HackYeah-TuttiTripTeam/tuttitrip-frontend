import { describe, expect, it } from 'vitest'
import {
  applyRealtimeEvent,
  EMPTY_VOICE_VIEW,
  micMayBeOpen,
  runningTool,
  visibleCaptions,
  voiceActivity,
} from './voice-events'

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

describe('tool calls and the phases of a turn', () => {
  const call = (name: string, id = 'c1') => ({
    type: 'response.output_item.added',
    item: { type: 'function_call', call_id: id, name },
  })
  const output = (text: string, id = 'c1') => ({
    type: 'conversation.item.added',
    item: { type: 'function_call_output', call_id: id, output: text },
  })

  it('goes from listening to hearing, thinking, saving and speaking, most specific first', () => {
    let view = EMPTY_VOICE_VIEW
    expect(voiceActivity(view)).toBe('listening')
    view = applyRealtimeEvent(view, { type: 'input_audio_buffer.speech_started' })
    expect(voiceActivity(view)).toBe('hearing')
    view = applyRealtimeEvent(view, { type: 'input_audio_buffer.speech_stopped' })
    expect(voiceActivity(view)).toBe('thinking')
    view = applyRealtimeEvent(view, { type: 'response.created' })
    view = applyRealtimeEvent(view, call('set_budget'))
    expect(voiceActivity(view)).toBe('saving')
    expect(runningTool(view)?.name).toBe('set_budget')
    view = applyRealtimeEvent(view, call('build_plan_now', 'c2'))
    view = applyRealtimeEvent(view, output('{}'))
    expect(voiceActivity(view)).toBe('building_plan')
    view = applyRealtimeEvent(view, output('{}', 'c2'))
    view = applyRealtimeEvent(view, { type: 'output_audio_buffer.started' })
    expect(voiceActivity(view)).toBe('speaking')
  })

  it('marks a refusal of a tool as failed and a result as done', () => {
    let view = applyRealtimeEvent(EMPTY_VOICE_VIEW, call('set_trip_basics'))
    view = applyRealtimeEvent(view, output('NOT SAVED: the host set destination'))
    expect(view.tools).toEqual([{ callId: 'c1', name: 'set_trip_basics', status: 'failed' }])
    view = applyRealtimeEvent(view, call('add_person', 'c2'))
    view = applyRealtimeEvent(view, output('{"person_id":"x"}', 'c2'))
    expect(view.tools[1]?.status).toBe('done')
  })

  it('does not reopen a finished call when the provider repeats its item', () => {
    let view = applyRealtimeEvent(EMPTY_VOICE_VIEW, call('set_budget'))
    view = applyRealtimeEvent(view, output('{}'))
    view = applyRealtimeEvent(view, { ...call('set_budget'), type: 'response.output_item.done' })
    expect(runningTool(view)).toBeUndefined()
  })

  it('keeps captions working next to the function items', () => {
    const view = [
      call('set_budget'),
      { type: 'conversation.item.added', item: { id: 'u1', role: 'user' } },
      {
        type: 'conversation.item.input_audio_transcription.completed',
        item_id: 'u1',
        transcript: 'hej',
      },
    ].reduce(applyRealtimeEvent, EMPTY_VOICE_VIEW)
    expect(texts(view)).toEqual(['user: hej'])
  })

  it('opens the microphone only while the assistant is idle', () => {
    expect(micMayBeOpen(EMPTY_VOICE_VIEW)).toBe(true)
    const heard = applyRealtimeEvent(EMPTY_VOICE_VIEW, {
      type: 'input_audio_buffer.speech_stopped',
    })
    expect(micMayBeOpen(heard)).toBe(false) // processing
    const responding = applyRealtimeEvent(heard, { type: 'response.created' })
    expect(micMayBeOpen(responding)).toBe(false)
    const tool = applyRealtimeEvent(responding, call('set_budget'))
    const done = applyRealtimeEvent(applyRealtimeEvent(tool, output('{}')), {
      type: 'response.done',
    })
    expect(micMayBeOpen(done)).toBe(true) // the tool is answered and the response is over
    const speaking = applyRealtimeEvent(done, { type: 'output_audio_buffer.started' })
    expect(micMayBeOpen(speaking)).toBe(false) // the voice is still playing
  })
})
