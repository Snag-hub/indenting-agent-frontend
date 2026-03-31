import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/customers')({
  component: lazy(() => import('@/features/accounts/pages/CustomersPage').then(m => ({ default: m.CustomersPage }))),
})
