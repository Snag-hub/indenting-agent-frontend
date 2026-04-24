import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/purchase-orders/$id')({
  component: lazy(() => import('@/features/purchaseOrders/pages/PurchaseOrderDetailPage').then(m => ({ default: m.PurchaseOrderDetailPage }))),
})
