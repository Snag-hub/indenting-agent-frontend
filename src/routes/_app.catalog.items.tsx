import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/catalog/items')({
  component: lazy(() => import('@/features/catalog/pages/CatalogItemsPage').then(m => ({ default: m.CatalogItemsPage }))),
})
