import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/enquiries/$id')({
  component: lazy(() => import('@/features/enquiries/pages/EnquiryDetailPage').then(m => ({ default: m.EnquiryDetailPage }))),
})
