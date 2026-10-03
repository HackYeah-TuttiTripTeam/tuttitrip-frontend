import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Example query; replace with real API calls
const greetingQueryOptions = queryOptions({
  queryKey: ['greeting'],
  queryFn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return { message: 'Frontend działa: React + Vite + shadcn + TanStack' }
  },
})

export const Route = createFileRoute('/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(greetingQueryOptions),
  component: HomePage,
})

function HomePage() {
  const { data } = useSuspenseQuery(greetingQueryOptions)

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>TuttiTrip</CardTitle>
        <CardDescription>{data.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button>Zaczynamy</Button>
      </CardContent>
    </Card>
  )
}
