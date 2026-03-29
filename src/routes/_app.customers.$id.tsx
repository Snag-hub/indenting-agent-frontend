import { createFileRoute } from '@tanstack/react-router'
import { CustomerDetailPage } from '@/features/accounts/pages/CustomerDetailPage'

export const Route = createFileRoute('/_app/customers/$id')({
  component: CustomerDetailPage,
})
