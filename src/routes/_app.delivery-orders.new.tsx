import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  poId: z.string(),
  piId: z.string().optional(),
})

export const Route = createFileRoute('/_app/delivery-orders/new')({
  validateSearch: searchSchema,
  component: lazy(() =>
    import('@/features/deliveryOrders/pages/CreateDeliveryOrderPage').then(m => ({ default: m.CreateDeliveryOrderPage }))
  ),
})
