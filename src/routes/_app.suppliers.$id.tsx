import { createFileRoute } from '@tanstack/react-router'
import { SupplierDetailPage } from '@/features/accounts/pages/SupplierDetailPage'

export const Route = createFileRoute('/_app/suppliers/$id')({
  component: SupplierDetailPage,
})
