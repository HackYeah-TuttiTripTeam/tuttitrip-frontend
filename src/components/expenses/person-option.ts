/** A person of the trip as the expense screens need them: an id to send and a name to show. */
export interface PersonOption {
  id: string
  name: string
}

export const personName = (people: PersonOption[], id: string, fallback: string) =>
  people.find((person) => person.id === id)?.name ?? fallback
