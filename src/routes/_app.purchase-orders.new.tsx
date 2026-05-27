import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { CreateDirectPurchaseOrderPage } from '@/features/purchaseOrders/pages/CreateDirectPurchaseOrderPage'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_app/purchase-orders/new')({
  validateSearch: z.object({
    editId: z.string().optional(),
  }),
  beforeLoad: () => {
    const role = useAuthStore.getState().user?.role
    if (role !== 'Customer' && role !== 'Admin')
      throw redirect({ to: '/purchase-orders' })
  },
  component: CreateDirectPurchaseOrderPage,
})
