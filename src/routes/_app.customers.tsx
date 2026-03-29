import { createFileRoute } from '@tanstack/react-router'
import { CustomersPage } from '@/features/accounts/pages/CustomersPage'

export const Route = createFileRoute('/_app/customers')({
  component: CustomersPage,
})
