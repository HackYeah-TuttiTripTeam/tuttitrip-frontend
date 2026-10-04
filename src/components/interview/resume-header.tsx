import type { ResumeField, ResumeSummary } from '@/lib/interview'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

const NAMES: Record<Exclude<ResumeField, 'people'>, () => string> = {
  destination: m.interview_resume_destination,
  dates: m.interview_resume_dates,
  budget: m.interview_resume_budget,
  preferences: m.interview_resume_preferences,
}

const fieldName = (field: ResumeField, peopleCount: number) =>
  field === 'people' ? m.people_count({ count: peopleCount }) : NAMES[field]()

const list = (items: string[]) =>
  new Intl.ListFormat(getLocale(), { style: 'long', type: 'conjunction' }).format(items)

/** "We are back: you have set the city and 3 people, the budget is missing", above the old chat. */
export function ResumeHeader({ summary }: { summary: ResumeSummary }) {
  const known = list(summary.known.map((field) => fieldName(field, summary.peopleCount)))
  const missing = list(summary.missing.map((field) => fieldName(field, summary.peopleCount)))
  const text =
    summary.known.length === 0
      ? m.interview_resume_nothing({ missing })
      : summary.missing.length === 0
        ? m.interview_resume_complete({ known })
        : m.interview_resume_partial({ known, missing })

  return (
    <p role="status" className="border-l-2 border-primary py-1 pl-3 text-sm leading-relaxed">
      <span className="font-medium">{m.interview_resume_title()}</span> {text}
    </p>
  )
}
