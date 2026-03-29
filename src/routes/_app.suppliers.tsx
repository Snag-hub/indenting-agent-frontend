import { createFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/features/accounts/pages/SuppliersPage'

export const Route = createFileRoute('/_app/suppliers')({
  component: SuppliersPage,
})
