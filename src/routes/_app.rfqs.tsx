import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/rfqs')({
  component: lazy(() => import('@/features/rfqs/pages/RFQsPage').then(m => ({ default: m.RFQsPage }))),
})
