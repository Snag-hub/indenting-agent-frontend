import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/payments/$id')({
  component: lazy(() =>
    import('@/features/payments/pages/PaymentDetailPage').then(m => ({
      default: m.PaymentDetailPage,
    }))
  ),
})
