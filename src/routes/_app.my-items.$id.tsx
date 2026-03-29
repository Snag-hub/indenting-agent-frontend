import { createFileRoute } from '@tanstack/react-router'
import { MyItemDetailPage } from '@/features/supplierCatalog/pages/MyItemDetailPage'

export const Route = createFileRoute('/_app/my-items/$id')({
  component: MyItemDetailPage,
})
