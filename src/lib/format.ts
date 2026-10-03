const dateFormat = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}

const pluralRules = new Intl.PluralRules('pl-PL')

/** Polish plural: forms are [one, few, many], e.g. ['wyjazd', 'wyjazdy', 'wyjazdów']. */
export function plural(count: number, [one, few, many]: readonly [string, string, string]): string {
  const rule = pluralRules.select(count)
  const word = rule === 'one' ? one : rule === 'few' ? few : many
  return `${count} ${word}`
}
