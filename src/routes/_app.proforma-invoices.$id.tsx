import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/proforma-invoices/$id')({
  component: lazy(() =>
    import('@/features/proformaInvoices/pages/ProformaInvoiceDetailPage').then(m => ({
      default: m.ProformaInvoiceDetailPage,
    }))
  ),
})
