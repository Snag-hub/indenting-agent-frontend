import { createFileRoute } from '@tanstack/react-router'
import { ItemMappingPage } from '@/features/supplierCatalog/pages/ItemMappingPage'

export const Route = createFileRoute('/_app/item-mapping')({
  component: ItemMappingPage,
})
