import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  poId: z.string(),
})

export const Route = createFileRoute('/_app/payments/new')({
  validateSearch: searchSchema,
  component: lazy(() =>
    import('@/features/payments/pages/CreatePaymentPage').then(m => ({ default: m.CreatePaymentPage }))
  ),
})
