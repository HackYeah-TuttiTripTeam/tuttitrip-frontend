import { describe, expect, it } from 'vitest'
import { uiTextProblems } from './ui-text-rules.mjs'

const flagged = (line, checkLiterals = false) => uiTextProblems(line, { checkLiterals }).length > 0

describe('rule 7 patterns', () => {
  it.each([
    '<Button onClick={go}>Zapisz wyjazd</Button>',
    '<p>Nic tu nie ma</p>',
    '<Button onClick={() => go()}>Zapisz</Button>',
    '<Input placeholder="Szukaj wyjazdu" />',
    '<button aria-label="Zamknij">',
    '<img alt="Logo" />',
  ])('flags %s', (line) => expect(flagged(line)).toBe(true))

  it.each([
    'items.map((x) => x.a < b.c)',
    'const [v, setV] = useState<Foo>(a) // b <c',
    'const ok = a.length > 0 && b < c',
    'const fn = (x: number) => x > 1 ? 1 : 2',
    '<div data-label="Foo" />',
    '<Input placeholder={m.search()} />',
    '<Button onClick={() => go()}>{m.save()}</Button>',
    '<Link to="/trips" />',
  ])('does not flag %s', (line) => expect(flagged(line)).toBe(false))

  it.each(["const label = 'Zapisz wyjazd'", 'setError("Something went wrong")', "return 'Zapisz'"])(
    'flags literal in %s',
    (line) => expect(flagged(line, true)).toBe(true),
  )

  it.each([
    "import { x } from '@/lib/some thing'",
    "const key = 'trips-list'",
    "navigate({ to: '/trips', search: { sort: 'name' } })",
    "headers.set('Accept-Language', locale)",
    'className="flex items-center"',
    "const variant = 'outline'",
  ])('does not flag literal in %s', (line) => expect(flagged(line, true)).toBe(false))
})
