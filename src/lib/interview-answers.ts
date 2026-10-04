import { m } from '@/paraglide/messages'
import { DOT_POOL_DOMAINS, DOT_POOL_TOTAL, SLIDER_STEPS } from './interview-constants'

/**
 * What a card sends back. The server takes the latest user text, so an answer is a sentence the
 * assistant can read (with the numbers in it) and the host can recognise in the transcript.
 */

export const answerToggles = (selected: readonly string[]) =>
  selected.length === 0
    ? m.interview_toggles_none()
    : m.interview_answer_toggles({ list: selected.join(', ') })

export const answerSwipe = (item: string, yes: boolean) =>
  (yes ? m.interview_answer_swipe_yes : m.interview_answer_swipe_no)({ item })

export const answerBudget = (from: number, to: number, currency: string) =>
  m.interview_answer_budget({ from, to, currency })

export interface FamilyPerson {
  name: string
  age: number
}

export const answerFamily = (people: readonly FamilyPerson[]) =>
  m.interview_answer_family({
    people: people
      .map((person) => m.interview_family_person({ name: person.name, age: person.age }))
      .join('; '),
  })

export const answerSlider = (question: string, value: number) =>
  m.interview_answer_slider({ question, value, max: SLIDER_STEPS })

export interface PoolItem {
  id: string
  label: string
}

const DOMAIN_LABELS: Record<(typeof DOT_POOL_DOMAINS)[number], () => string> = {
  lodging: m.interview_pool_domain_lodging,
  food: m.interview_pool_domain_food,
  attractions: m.interview_pool_domain_attractions,
  pace: m.interview_pool_domain_pace,
  cost: m.interview_pool_domain_cost,
}

/** The assistant's own options, or the five domains of the importance pool. */
export const poolItems = (options: readonly string[]): PoolItem[] =>
  options.length >= 2
    ? options.map((label) => ({ id: label, label }))
    : DOT_POOL_DOMAINS.map((id) => ({ id, label: DOMAIN_LABELS[id]() }))

export const answerPool = (items: readonly PoolItem[], points: readonly number[]) =>
  m.interview_answer_pool({
    parts: items
      .map((item, index) => ({ label: item.label, value: points[index] ?? 0 }))
      .filter((part) => part.value > 0)
      .map((part) => `${part.label} ${part.value}`)
      .join(', '),
  })

/** Points still free; never negative. */
export const poolLeft = (points: readonly number[]) =>
  Math.max(0, DOT_POOL_TOTAL - points.reduce((sum, value) => sum + value, 0))
