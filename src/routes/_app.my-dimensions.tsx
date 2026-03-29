import { createFileRoute } from '@tanstack/react-router'
import { MyDimensionsPage } from '@/features/supplierCatalog/pages/MyDimensionsPage'

export const Route = createFileRoute('/_app/my-dimensions')({
  component: MyDimensionsPage,
})


