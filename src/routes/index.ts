import { createFileRoute } from '@tanstack/react-router'
import { HomeView } from '@/views/home-view'

export const Route = createFileRoute('/')({ component: HomeView })
