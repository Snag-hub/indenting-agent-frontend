import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/my-items/$id')({
  component: lazy(() => import('@/features/supplierCatalog/pages/MyItemDetailPage').then(m => ({ default: m.MyItemDetailPage }))),
})
