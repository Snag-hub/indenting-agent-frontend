import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/customers/$id')({
  component: lazy(() => import('@/features/accounts/pages/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage }))),
})
