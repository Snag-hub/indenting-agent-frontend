import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  rfqId: z.string(),
})

export const Route = createFileRoute('/_app/quotations/new')({
  validateSearch: searchSchema,
  component: lazy(() =>
    import('@/features/quotations/pages/CreateQuotationPage').then(m => ({ default: m.CreateQuotationPage }))
  ),
})
