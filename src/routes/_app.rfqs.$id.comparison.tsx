import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/rfqs/$id/comparison')({
  component: lazy(() => import('@/features/rfqs/pages/QuotationComparisonPage').then(m => ({ default: m.QuotationComparisonPage }))),
})
