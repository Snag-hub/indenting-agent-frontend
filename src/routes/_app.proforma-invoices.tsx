import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/proforma-invoices')({
  component: lazy(() =>
    import('@/features/proformaInvoices/pages/ProformaInvoicesPage').then(m => ({
      default: m.ProformaInvoicesPage,
    }))
  ),
})
