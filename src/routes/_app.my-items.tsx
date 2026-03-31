import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/my-items')({
  component: lazy(() => import('@/features/supplierCatalog/pages/MyItemsPage').then(m => ({ default: m.MyItemsPage }))),
})
