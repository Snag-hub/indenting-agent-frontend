import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/quotations/$id')({
  component: lazy(() => import('@/features/quotations/pages/QuotationDetailPage').then(m => ({ default: m.QuotationDetailPage }))),
})
