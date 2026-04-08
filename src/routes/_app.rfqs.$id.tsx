import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/rfqs/$id')({
  component: lazy(() => import('@/features/rfqs/pages/RFQDetailPage').then(m => ({ default: m.RFQDetailPage }))),
})
