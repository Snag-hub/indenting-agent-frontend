import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/tickets/$id')({
  component: lazy(() => import('@/features/tickets/pages/TicketDetailPage').then(m => ({ default: m.TicketDetailPage }))),
})
