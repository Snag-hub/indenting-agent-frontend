import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/tickets')({
  component: lazy(() => import('@/features/tickets/pages/TicketsPage').then(m => ({ default: m.TicketsPage }))),
})
