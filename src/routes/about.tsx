import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">O projekcie</h1>
      <p className="text-muted-foreground">
        Aplikacja frontendowa zespołu TuttiTrip na HackYeah.
      </p>
    </div>
  )
}
