import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/enquiries')({
  component: lazy(() => import('@/features/enquiries/pages/EnquiriesPage').then(m => ({ default: m.EnquiriesPage }))),
})
