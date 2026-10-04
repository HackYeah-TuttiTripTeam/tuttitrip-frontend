import { describe, expect, it } from 'vitest'
import {
  defaultValues,
  describeRange,
  differs,
  inRange,
  mapValidationErrors,
  PARAMETERS,
  planningFormSchema,
  toFormValues,
  toRequest,
} from './planning-parameters'

const spec = (key: string) => {
  const found = PARAMETERS.find((candidate) => candidate.key === key)
  if (!found) throw new Error(`no parameter ${key}`)
  return found
}

describe('the parameter table', () => {
  it('lists every parameter of the API once, with its built-in value inside its range', () => {
    expect(new Set(PARAMETERS.map((p) => p.key)).size).toBe(PARAMETERS.length)
    expect(PARAMETERS).toHaveLength(24)
    for (const p of PARAMETERS) expect(inRange(p, p.fallback), p.key).toBe(true)
  })

  it('makes the built-in set a valid form', () => {
    expect(planningFormSchema.safeParse(toFormValues(defaultValues())).success).toBe(true)
  })
})

describe('ranges', () => {
  it('closed bounds accept their ends', () => {
    expect(inRange(spec('alpha'), 0)).toBe(true)
    expect(inRange(spec('alpha'), 3)).toBe(true)
    expect(inRange(spec('alpha'), 3.01)).toBe(false)
    expect(inRange(spec('alpha'), -0.1)).toBe(false)
  })

  it('an open bound refuses its end', () => {
    expect(inRange(spec('kappa_food'), 0)).toBe(false)
    expect(inRange(spec('kappa_food'), 5)).toBe(true)
    expect(inRange(spec('strong_preference'), 1)).toBe(false)
    expect(inRange(spec('strong_preference'), 0.99)).toBe(true)
  })

  it('a whole-number parameter refuses fractions and NaN', () => {
    expect(inRange(spec('tau_ref_min'), 90)).toBe(true)
    expect(inRange(spec('tau_ref_min'), 90.5)).toBe(false)
    expect(inRange(spec('alpha'), Number.NaN)).toBe(false)
  })

  it('describes the range for people', () => {
    expect(describeRange(spec('alpha'))).toBe('0 do 3')
    expect(describeRange(spec('kappa_food'))).toBe('powyżej 0 do 5')
    expect(describeRange(spec('strong_preference'))).toBe('powyżej 0 do poniżej 1')
  })
})

describe('the form schema', () => {
  const base = toFormValues(defaultValues())

  it('rejects a value outside the range and names its field', () => {
    const result = planningFormSchema.safeParse({ ...base, alpha: 3.5 })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['alpha'])
  })

  it('rejects a missing number', () => {
    expect(planningFormSchema.safeParse({ ...base, epsilon: Number.NaN }).success).toBe(false)
  })

  it('wants the iconic threshold below the "fits" threshold', () => {
    const result = planningFormSchema.safeParse({ ...base, verdict_iconic: 0.5, verdict_fits: 0.1 })
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['verdict_iconic'])
  })

  it('limits the note', () => {
    expect(planningFormSchema.safeParse({ ...base, note: 'x'.repeat(501) }).success).toBe(false)
  })
})

describe('talking to the API', () => {
  it('sends the values and a trimmed note, or no note', () => {
    const form = { ...toFormValues(defaultValues()), note: '  θ w górę  ' }
    expect(toRequest(form).note).toBe('θ w górę')
    expect(toRequest({ ...form, note: '   ' }).note).toBeNull()
    expect(toRequest(form).values).toEqual(defaultValues())
  })

  it('sees whether the form differs from the version in force', () => {
    const current = defaultValues()
    expect(differs(toFormValues(current), current)).toBe(false)
    expect(differs({ ...toFormValues(current), alpha: 2 }, current)).toBe(true)
  })

  it('puts a 422 on the parameter it names', () => {
    const detail = [
      { loc: ['body', 'values', 'alpha'], msg: 'too big', type: 'less_than_equal' },
      { loc: ['body', 'note'], msg: 'ignored', type: 'string_too_long' },
    ]
    expect(mapValidationErrors(detail)).toEqual({ alpha: 'too big' })
    expect(mapValidationErrors('nope')).toEqual({})
  })
})
