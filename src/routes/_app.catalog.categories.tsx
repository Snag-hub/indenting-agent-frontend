import { createFileRoute } from '@tanstack/react-router'
import { CatalogCategoriesPage } from '@/features/catalog/pages/CatalogCategoriesPage'

export const Route = createFileRoute('/_app/catalog/categories')({
  component: CatalogCategoriesPage,
})

