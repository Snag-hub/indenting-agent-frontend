import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/delivery-orders')({
  component: lazy(() =>
    import('@/features/deliveryOrders/pages/DeliveryOrdersPage').then(m => ({
      default: m.DeliveryOrdersPage,
    }))
  ),
})
