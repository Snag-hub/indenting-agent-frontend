import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

/**
 * Search-param schema for the Create RFQ route.
 * `enquiryId` is passed when navigating from EnquiryDetailPage so the form
 * can auto-select the linked enquiry and pre-load its items.
 */
const searchSchema = z.object({
  enquiryId: z.string().optional(),
})

export const Route = createFileRoute('/_app/rfqs/new')({
  validateSearch: searchSchema,
  component: lazy(() => import('@/features/rfqs/pages/CreateRFQPage').then(m => ({ default: m.CreateRFQPage }))),
})
