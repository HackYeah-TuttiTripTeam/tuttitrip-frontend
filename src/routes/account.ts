import { createFileRoute } from '@tanstack/react-router'
import { accountHead } from '@/loaders/account'
import { AccountView } from '@/views/account-view'

export const Route = createFileRoute('/account')({ head: accountHead, component: AccountView })
