import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/delivery-orders/$id')({
  component: lazy(() =>
    import('@/features/deliveryOrders/pages/DeliveryOrderDetailPage').then(m => ({
      default: m.DeliveryOrderDetailPage,
    }))
  ),
})
