import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/suppliers')({
  component: lazy(() => import('@/features/accounts/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage }))),
})
