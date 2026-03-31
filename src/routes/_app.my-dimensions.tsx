import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/my-dimensions')({
  component: lazy(() => import('@/features/supplierCatalog/pages/MyDimensionsPage').then(m => ({ default: m.MyDimensionsPage }))),
})


