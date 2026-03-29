import { createFileRoute } from '@tanstack/react-router'
import { ItemDetailPage } from '@/features/catalog/pages/ItemDetailPage'

export const Route = createFileRoute('/_app/catalog/items/$id')({
  component: ItemDetailPage,
})
