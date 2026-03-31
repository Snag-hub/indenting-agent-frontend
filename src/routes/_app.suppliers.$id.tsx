import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/suppliers/$id')({
  component: lazy(() => import('@/features/accounts/pages/SupplierDetailPage').then(m => ({ default: m.SupplierDetailPage }))),
})
