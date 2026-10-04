// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { TOUR } from '@/lib/help'
import { joinTopic, tripsTopic, tripTopics } from '@/lib/help-topics'
import { findTourTarget, resolveSteps, type TourTopic } from './help'

afterEach(() => {
  document.body.innerHTML = ''
})

const topic: TourTopic = {
  id: 't',
  title: () => 'T',
  steps: [
    { id: 'a', target: 'a', title: () => 'A', body: () => 'a' },
    { id: 'b', target: 'b', optional: true, title: () => 'B', body: () => 'b' },
    { id: 'c', title: () => 'C', body: () => 'c' },
    { id: 'd', target: 'd', title: () => 'D', body: () => 'd' },
  ],
}

describe('resolveSteps', () => {
  it('drops optional steps whose target is missing and keeps the rest', () => {
    document.body.innerHTML = '<div data-tour="a"></div>'
    expect(resolveSteps(topic).map((step) => step.id)).toEqual(['a', 'c', 'd'])
  })

  it('keeps an optional step when its element is on the page', () => {
    document.body.innerHTML = '<div data-tour="a"></div><div data-tour="b"></div>'
    expect(resolveSteps(topic).map((step) => step.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('findTourTarget', () => {
  it('matches the data-tour attribute only, not classes or ids', () => {
    document.body.innerHTML = '<div class="a" id="a"></div><p data-tour="a"></p>'
    expect(findTourTarget('a')?.tagName).toBe('P')
  })

  it('skips an element that is not visible and takes the next copy', () => {
    document.body.innerHTML =
      '<div data-tour="a" id="hidden"></div><div data-tour="a" id="shown"></div>'
    const hidden = document.getElementById('hidden')
    if (!hidden) throw new Error('fixture')
    hidden.checkVisibility = () => false
    expect(findTourTarget('a')?.id).toBe('shown')
  })

  it('returns null when nothing matches', () => {
    expect(findTourTarget('missing')).toBeNull()
  })
})

describe('topics', () => {
  const all = [tripsTopic, joinTopic, ...Object.values(tripTopics)]
  const known = new Set<string>(Object.values(TOUR))

  it('point only at registered data-tour names and have unique step ids', () => {
    for (const each of all) {
      const ids = each.steps.map((step) => step.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const step of each.steps) {
        if (step.target) expect(known.has(step.target)).toBe(true)
      }
    }
  })

  it('give every step a title and a body', () => {
    for (const each of all) {
      expect(each.title()).not.toBe('')
      for (const step of each.steps) {
        expect(step.title()).not.toBe('')
        expect(step.body()).not.toBe('')
      }
    }
  })
})
