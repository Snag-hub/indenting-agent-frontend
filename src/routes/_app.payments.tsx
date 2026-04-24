import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/payments')({
  component: lazy(() =>
    import('@/features/payments/pages/PaymentsPage').then(m => ({
      default: m.PaymentsPage,
    }))
  ),
})
