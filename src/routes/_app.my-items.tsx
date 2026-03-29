import { createFileRoute } from '@tanstack/react-router'
import { MyItemsPage } from '@/features/supplierCatalog/pages/MyItemsPage'

export const Route = createFileRoute('/_app/my-items')({
  component: MyItemsPage,
})
