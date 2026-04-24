import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  entityNumber: z.string().optional(),
})

export const Route = createFileRoute('/_app/tickets/new')({
  validateSearch: searchSchema,
  component: lazy(() => import('@/features/tickets/pages/CreateTicketPage').then(m => ({ default: m.CreateTicketPage }))),
})
