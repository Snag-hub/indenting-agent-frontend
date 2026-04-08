import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/quotations')({
  component: lazy(() => import('@/features/quotations/pages/QuotationsPage').then(m => ({ default: m.QuotationsPage }))),
})
