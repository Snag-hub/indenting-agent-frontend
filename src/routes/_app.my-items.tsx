import { createFileRoute } from '@tanstack/react-router'
import { CustomerMyItemsPage } from '@/features/customerCatalog/pages/CustomerMyItemsPage'
import { MyItemsPage } from '@/features/supplierCatalog/pages/MyItemsPage'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_app/my-items')({
  component: MyItemsDispatch,
})

function MyItemsDispatch() {
  const role = useAuthStore((s) => s.user?.role)

  if (role === 'Customer') return <CustomerMyItemsPage />
  if (role === 'Supplier') return <MyItemsPage />

  return (
    <div className="p-6">
      <p className="text-slate-600">Access denied. Invalid role.</p>
    </div>
  )
}
