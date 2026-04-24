import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/purchase-orders')({
  component: lazy(() => import('@/features/purchaseOrders/pages/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage }))),
})
