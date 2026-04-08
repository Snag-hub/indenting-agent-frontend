import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/rfqs/new')({
  component: lazy(() => import('@/features/rfqs/pages/CreateRFQPage').then(m => ({ default: m.CreateRFQPage }))),
})
