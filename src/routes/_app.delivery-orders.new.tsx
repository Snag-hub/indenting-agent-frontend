import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

// DO creation is now PI-rooted: a DO can only ship what its parent PI invoiced.
const searchSchema = z.object({
  piId: z.string(),
})

export const Route = createFileRoute('/_app/delivery-orders/new')({
  validateSearch: searchSchema,
  component: lazy(() =>
    import('@/features/deliveryOrders/pages/CreateDeliveryOrderPage').then(m => ({ default: m.CreateDeliveryOrderPage }))
  ),
})
