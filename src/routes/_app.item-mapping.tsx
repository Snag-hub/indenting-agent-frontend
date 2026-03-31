import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/item-mapping')({
  component: lazy(() => import('@/features/supplierCatalog/pages/ItemMappingPage').then(m => ({ default: m.ItemMappingPage }))),
})
