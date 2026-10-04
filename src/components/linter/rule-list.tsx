import { CircleAlert, CircleCheck, TriangleAlert } from '@keyline-icons/react'
import type { LintFinding, LintReport } from '@/api/queries/linter'
import { m } from '@/paraglide/messages'
import { ruleLabel } from './rule-labels'

function FindingLine({ finding }: { finding: LintFinding }) {
  const where = [finding.day, finding.place_name, finding.person_name].filter(Boolean).join(' · ')
  return (
    <li className="flex flex-col gap-0.5 text-sm">
      <span>{finding.message}</span>
      {where && <span className="text-muted-foreground text-xs">{where}</span>}
    </li>
  )
}

interface RuleListProps {
  report: LintReport
}

/** Every rule with its count (also 0), so the number is visibly the code's, not a model's opinion. */
export function RuleList({ report }: RuleListProps) {
  return (
    <section aria-labelledby="lint-rules" className="flex flex-col gap-2">
      <h2 id="lint-rules" className="font-medium text-base">
        {m.lint_rules_title()}
      </h2>
      <ul>
        {report.results.map((result) => {
          const clean = result.count === 0
          const Icon = clean ? CircleCheck : CircleAlert
          return (
            <li key={result.rule} className="flex flex-col gap-2 border-b py-3">
              <div className="flex min-h-8 items-center gap-2">
                <Icon
                  aria-hidden="true"
                  className={`size-5 shrink-0 ${clean ? 'text-want-ink' : 'text-danger-ink'}`}
                />
                <span className="min-w-0 flex-1 text-sm">{ruleLabel(result.rule)}</span>
                <span className="font-semibold text-sm tabular-nums">
                  {m.lint_rule_count({ count: result.count })}
                </span>
              </div>
              {result.violations.length > 0 && (
                <ul className="ml-7 flex flex-col gap-2">
                  {result.violations.map((finding, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: findings have no id; the list is static per report
                    <FindingLine key={index} finding={finding} />
                  ))}
                </ul>
              )}
              {result.warnings.length > 0 && (
                <ul className="ml-7 flex flex-col gap-2">
                  {result.warnings.map((finding, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: findings have no id; the list is static per report
                    <li key={index} className="flex items-start gap-1 text-sm">
                      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span>
                        <span className="sr-only">{m.lint_warning()}: </span>
                        {finding.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
