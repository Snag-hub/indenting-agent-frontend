import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/catalog/categories')({
  component: lazy(() => import('@/features/catalog/pages/CatalogCategoriesPage').then(m => ({ default: m.CatalogCategoriesPage }))),
})

