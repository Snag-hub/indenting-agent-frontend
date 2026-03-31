import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/catalog/items/$id')({
  component: lazy(() => import('@/features/catalog/pages/ItemDetailPage').then(m => ({ default: m.ItemDetailPage }))),
})
