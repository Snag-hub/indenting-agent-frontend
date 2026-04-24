import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/proforma-invoices/$id/print')({
  component: lazy(() => import('@/features/proformaInvoices/pages/ProformaInvoicePrintPage').then(m => ({ default: m.ProformaInvoicePrintPage }))),
})
