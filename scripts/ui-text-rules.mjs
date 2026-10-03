// Patterns behind rule 7 of check-arch.mjs (no hard-coded UI text). Kept apart so
// ui-text-rules.test.mjs can probe them with positive and negative samples.

// Text-bearing attributes, not preceded by a word char or "-" (so data-label="x" is fine).
export const TEXT_ATTRIBUTES =
  /(?<![\w-])(?:placeholder|aria-label|aria-description|title|alt|label)="[^"{}]*\p{L}[^"{}]*"/u

// Text between an opening tag and the next tag. The "<" must start a tag (not follow an
// identifier, ")" or "]" as in generics, and have a letter right after it, so comparisons
// like `a < b` do not count), and the ">" must close that tag (not "=>" or "->").
export const JSX_TEXT =
  /(?<![\w)\]])<[A-Za-z][\w.:-]*(?:[^<>]|=>)*?(?<![=-])>([^<>{}=;\n]*\p{L}[^<>{}=;\n]*)<[/A-Za-z>]/u

// A line of loose words: JSX text that wraps onto its own line (no tags, braces, quotes or code).
export const LOOSE_TEXT =
  /^[^<>{}=;()'"`/\\&|?:[\]]*\p{L}{2,}\s+[^<>{}=;()'"`/\\&|?:[\]]*\p{L}{2,}[^<>{}=;()'"`]*$/u

// A string literal that reads like a sentence: two or more plain words ("Save trip") or a
// single capitalised word of 4+ letters ("Zapisz"). Identifiers, paths, enums and class
// lists (hyphens, digits, colons, slashes) do not match.
const WORDS = String.raw`\p{L}[\p{L}'’.,!?…]*(?: \p{L}[\p{L}'’.,!?…]*)+`
const CAPITALISED = String.raw`\p{Lu}\p{Ll}{3,}`
export const WORD_LITERAL = new RegExp(`(['"\`])(?:${WORDS}|${CAPITALISED})\\1`, 'u')

const SKIPPED_LINE =
  /^(\/\/|\*|\/\*|import |export \* |export \{[^}]*\} from |type |interface )|\b(?:className|class|cn|cva)\b/

/** Reasons a source line looks like hard-coded UI text (empty when it does not). */
export function uiTextProblems(line, { checkLiterals }) {
  const code = line.trim()
  if (SKIPPED_LINE.test(code)) return []
  const problems = []
  if (TEXT_ATTRIBUTES.test(code)) problems.push('text attribute')
  if (JSX_TEXT.test(code)) problems.push('JSX text')
  if (/^(?!return |const |let |else |case |default )/.test(code) && LOOSE_TEXT.test(code))
    problems.push('loose JSX text')
  if (checkLiterals && WORD_LITERAL.test(code)) problems.push('string literal')
  return problems
}
