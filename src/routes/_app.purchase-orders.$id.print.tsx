import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/purchase-orders/$id/print')({
  component: lazy(() => import('@/features/purchaseOrders/pages/PurchaseOrderPrintPage').then(m => ({ default: m.PurchaseOrderPrintPage }))),
})
