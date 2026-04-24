import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  poId: z.string(),
})

export const Route = createFileRoute('/_app/proforma-invoices/new')({
  validateSearch: searchSchema,
  component: lazy(() =>
    import('@/features/proformaInvoices/pages/CreateProformaInvoicePage').then(m => ({ default: m.CreateProformaInvoicePage }))
  ),
})
